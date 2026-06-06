const { query } = require('../config/database');
const { computeOperationalRisk } = require('../utils/riskEngine');

exports.getCommandCenter = async (req, res, next) => {
  try {
    const { rows: zones } = await query(`
      SELECT fz.*,
             ST_AsGeoJSON(fz.geometry)::json AS geometry,
             COALESCE(wr.rainfall_1h,0) AS rainfall_1h,
             COALESCE(wr.rainfall_24h,0) AS rainfall_24h,
             COALESCE(wr.rainfall_72h,0) AS rainfall_72h,
             COALESCE(wr.temperature,0) AS temperature,
             COALESCE(wr.humidity,0) AS humidity,
             COALESCE(p.flood_probability, fz.risk_score,0) AS flood_probability,
             p.predicted_at,
             COALESCE(ia.population_exposed,0) AS population_exposed,
             COALESCE(ia.buildings_exposed,0) AS buildings_exposed,
             COALESCE(ia.roads_km_exposed,0) AS roads_km_exposed,
             COALESCE(ia.schools_exposed,0) AS schools_exposed,
             COALESCE(ia.health_facilities_exposed,0) AS health_facilities_exposed,
             COALESCE(ia.max_depth_m,0) AS max_depth_m,
             COALESCE(ia.mean_depth_m,0) AS mean_depth_m
      FROM flood_zones fz
      LEFT JOIN LATERAL (SELECT * FROM weather_readings WHERE zone_id=fz.id ORDER BY timestamp DESC LIMIT 1) wr ON TRUE
      LEFT JOIN LATERAL (SELECT * FROM predictions WHERE zone_id=fz.id ORDER BY predicted_at DESC LIMIT 1) p ON TRUE
      LEFT JOIN LATERAL (SELECT * FROM impact_assessments WHERE zone_id=fz.id ORDER BY assessed_at DESC LIMIT 1) ia ON TRUE
      ORDER BY fz.risk_score DESC, fz.population DESC
    `);

    const enriched = zones.map(z => {
      const risk = computeOperationalRisk({
        zone: z,
        weather: z,
        prediction: { flood_probability: z.flood_probability },
        impact: z,
      });
      return { ...z, operational_risk: risk };
    });

    const summary = {
      total_zones: enriched.length,
      critical_zones: enriched.filter(z => z.operational_risk.risk_level === 4).length,
      high_zones: enriched.filter(z => z.operational_risk.risk_level === 3).length,
      exposed_population: enriched.reduce((s,z)=>s+Number(z.population_exposed||0),0),
      exposed_buildings: enriched.reduce((s,z)=>s+Number(z.buildings_exposed||0),0),
      roads_km_exposed: Number(enriched.reduce((s,z)=>s+Number(z.roads_km_exposed||0),0).toFixed(2)),
      max_depth_m: Math.max(0, ...enriched.map(z=>Number(z.max_depth_m||0))),
      generated_at: new Date().toISOString(),
    };

    res.json({ success: true, data: { summary, priority_zones: enriched.slice(0, 10), zones: enriched } });
  } catch (err) { next(err); }
};

exports.getDataQuality = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT dq.*, fz.commune
      FROM data_quality_flags dq
      LEFT JOIN flood_zones fz ON fz.id = dq.zone_id
      ORDER BY dq.checked_at DESC
      LIMIT 200
    `);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { next(err); }
};
