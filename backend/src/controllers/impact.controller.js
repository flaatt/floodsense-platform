const { query } = require('../config/database');
const { computeOperationalRisk } = require('../utils/riskEngine');

async function getZoneOperationalProfile(zoneId) {
  const { rows: zones } = await query(`
    SELECT fz.*, ST_AsGeoJSON(fz.geometry)::json AS geometry
    FROM flood_zones fz
    WHERE fz.id = $1
  `, [zoneId]);
  if (!zones.length) return null;
  const zone = zones[0];

  const { rows: latestWeather } = await query(`
    SELECT * FROM weather_readings
    WHERE zone_id = $1
    ORDER BY timestamp DESC
    LIMIT 1
  `, [zoneId]);

  const { rows: latestPrediction } = await query(`
    SELECT * FROM predictions
    WHERE zone_id = $1
    ORDER BY predicted_at DESC
    LIMIT 1
  `, [zoneId]);

  const { rows: exposure } = await query(`
    SELECT
      COALESCE(SUM(population_exposed), 0)::int AS population_exposed,
      COALESCE(SUM(buildings_exposed), 0)::int AS buildings_exposed,
      COALESCE(SUM(roads_km_exposed), 0)::float AS roads_km_exposed,
      COALESCE(SUM(schools_exposed), 0)::int AS schools_exposed,
      COALESCE(SUM(health_facilities_exposed), 0)::int AS health_facilities_exposed,
      COALESCE(SUM(markets_exposed), 0)::int AS markets_exposed,
      COALESCE(MAX(max_depth_m), 0)::float AS max_depth_m,
      COALESCE(AVG(mean_depth_m), 0)::float AS mean_depth_m
    FROM impact_assessments
    WHERE zone_id = $1
      AND assessed_at >= NOW() - INTERVAL '48 hours'
  `, [zoneId]);

  const { rows: infra } = await query(`
    SELECT
      (SELECT COUNT(*) FROM critical_infrastructure WHERE zone_id=$1 AND asset_type='school')::int AS schools_count,
      (SELECT COUNT(*) FROM critical_infrastructure WHERE zone_id=$1 AND asset_type='health')::int AS health_count,
      (SELECT COUNT(*) FROM road_segments WHERE zone_id=$1)::int AS road_segments_count,
      (SELECT COUNT(*) FROM evacuation_centers WHERE zone_id=$1)::int AS evacuation_centers_count,
      (SELECT COUNT(*) FROM contacts WHERE zone_id=$1 AND active=true)::int AS contacts_count
  `, [zoneId]);

  const operational = computeOperationalRisk({
    zone,
    weather: latestWeather[0] || {},
    prediction: latestPrediction[0] || {},
    impact: { ...exposure[0], ...infra[0] },
  });

  return {
    zone,
    current_weather: latestWeather[0] || null,
    current_prediction: latestPrediction[0] || null,
    impact: exposure[0],
    infrastructure: infra[0],
    operational_risk: operational,
  };
}

exports.getZoneImpact = async (req, res, next) => {
  try {
    const profile = await getZoneOperationalProfile(req.params.id);
    if (!profile) return res.status(404).json({ success: false, error: 'Zone introuvable' });
    res.json({ success: true, data: profile });
  } catch (err) { next(err); }
};

exports.getCityImpact = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*)::int AS zones_count,
        COALESCE(SUM(population_exposed),0)::int AS population_exposed,
        COALESCE(SUM(buildings_exposed),0)::int AS buildings_exposed,
        COALESCE(SUM(roads_km_exposed),0)::float AS roads_km_exposed,
        COALESCE(SUM(schools_exposed),0)::int AS schools_exposed,
        COALESCE(SUM(health_facilities_exposed),0)::int AS health_facilities_exposed,
        COALESCE(MAX(max_depth_m),0)::float AS max_depth_m
      FROM impact_assessments
      WHERE assessed_at >= NOW() - INTERVAL '48 hours'
    `);

    const { rows: ranking } = await query(`
      SELECT ia.*, fz.commune, fz.risk_level, fz.risk_score
      FROM impact_assessments ia
      JOIN flood_zones fz ON fz.id = ia.zone_id
      WHERE ia.assessed_at >= NOW() - INTERVAL '48 hours'
      ORDER BY ia.population_exposed DESC, fz.risk_score DESC
      LIMIT 10
    `);

    res.json({ success: true, data: { summary: rows[0], priority_zones: ranking } });
  } catch (err) { next(err); }
};

exports.runImpactAssessment = async (req, res, next) => {
  try {
    const zoneIds = req.body.zone_ids;
    const params = [];
    let where = '';
    if (Array.isArray(zoneIds) && zoneIds.length) {
      params.push(zoneIds.map(Number));
      where = 'WHERE id = ANY($1)';
    }

    const { rows: zones } = await query(`SELECT * FROM flood_zones ${where}`, params);
    const results = [];

    for (const zone of zones) {
      const probability = Number(zone.risk_score || 0.1);
      const depth = Math.max(0, probability * 1.25 + (Number(zone.drainage_density || 0) * 0.08) - (Number(zone.elevation_min || 300) > 340 ? 0.2 : 0));
      const exposedRatio = Math.min(0.85, Math.max(0.03, probability * 0.75 + Number(zone.impervious_ratio || 0) * 0.15));
      const populationExposed = Math.round(Number(zone.population || 0) * exposedRatio);
      const buildingsExposed = Math.round(populationExposed / 5.2);
      const roadsKm = Number((Number(zone.area_sqkm || 1) * exposedRatio * 0.55).toFixed(2));
      const schools = Math.round(populationExposed / 45000);
      const health = Math.round(populationExposed / 120000);
      const markets = Math.round(populationExposed / 90000);

      const { rows } = await query(`
        INSERT INTO impact_assessments
          (zone_id, scenario_name, hazard_probability, mean_depth_m, max_depth_m,
           population_exposed, buildings_exposed, roads_km_exposed,
           schools_exposed, health_facilities_exposed, markets_exposed,
           method, confidence)
        VALUES ($1, 'current_operational', $2, $3, $4, $5, $6, $7, $8, $9, $10,
                'deterministic_composite_v2', $11)
        RETURNING *
      `, [
        zone.id,
        probability,
        Number((depth * 0.55).toFixed(2)),
        Number(depth.toFixed(2)),
        populationExposed,
        buildingsExposed,
        roadsKm,
        schools,
        health,
        markets,
        probability >= 0.5 ? 'medium' : 'low'
      ]);

      results.push({ commune: zone.commune, ...rows[0] });
    }

    res.json({ success: true, message: `${results.length} évaluations d'impact générées`, data: results });
  } catch (err) { next(err); }
};

exports.getZoneOperationalProfile = getZoneOperationalProfile;
