// ─────────────────────────────────────────────────────────────
//  src/controllers/zones.controller.js
// ─────────────────────────────────────────────────────────────
const { query } = require('../config/database');
const { cacheGet, cacheSet } = require('../config/redis');
const { computeOperationalRisk } = require('../utils/riskEngine');

// GET /api/zones — Toutes les zones avec risque actuel
exports.getAllZones = async (req, res, next) => {
  try {
    const cacheKey = 'api:zones:all';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const { risk_level, commune, limit = 50 } = req.query;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (risk_level) {
      params.push(parseInt(risk_level));
      whereClause += ` AND fz.risk_level = $${params.length}`;
    }
    if (commune) {
      params.push(`%${commune}%`);
      whereClause += ` AND fz.commune ILIKE $${params.length}`;
    }
    params.push(Math.min(parseInt(limit), 100));

    const { rows } = await query(`
      SELECT
        fz.id, fz.commune, fz.quartier,
        fz.risk_level, fz.risk_score,
        fz.elevation_avg, fz.elevation_min,
        fz.population, fz.area_sqkm,
        fz.impervious_ratio, fz.drainage_density,
        fz.last_updated,
        ST_AsGeoJSON(fz.geometry)::json AS geometry,
        COALESCE(wr.rainfall_1h,  0) AS rainfall_1h,
        COALESCE(wr.rainfall_24h, 0) AS rainfall_24h,
        COALESCE(wr.temperature,  0) AS temperature,
        COALESCE(wr.humidity,     0) AS humidity,
        COALESCE(wr.weather_desc, 'N/A') AS weather_desc,
        COUNT(DISTINCT fe.id) AS total_flood_events,
        MAX(fe.event_date)    AS last_flood_date,
        p.flood_probability   AS last_prediction_score,
        p.recommendation      AS last_recommendation,
        COALESCE(ia.population_exposed, 0) AS population_exposed,
        COALESCE(ia.buildings_exposed, 0) AS buildings_exposed,
        COALESCE(ia.roads_km_exposed, 0) AS roads_km_exposed,
        COALESCE(ia.schools_exposed, 0) AS schools_exposed,
        COALESCE(ia.health_facilities_exposed, 0) AS health_facilities_exposed,
        COALESCE(ia.max_depth_m, 0) AS max_depth_m,
        COALESCE(ia.mean_depth_m, 0) AS mean_depth_m,
        COALESCE(ia.confidence, 'low') AS impact_confidence
      FROM flood_zones fz
      LEFT JOIN LATERAL (
        SELECT rainfall_1h, rainfall_24h, temperature, humidity, weather_desc
        FROM weather_readings
        WHERE zone_id = fz.id
        ORDER BY timestamp DESC LIMIT 1
      ) wr ON TRUE
      LEFT JOIN flood_events fe ON fe.zone_id = fz.id
      LEFT JOIN LATERAL (
        SELECT flood_probability, recommendation
        FROM predictions
        WHERE zone_id = fz.id
        ORDER BY predicted_at DESC LIMIT 1
      ) p ON TRUE
      LEFT JOIN LATERAL (
        SELECT population_exposed, buildings_exposed, roads_km_exposed, schools_exposed,
               health_facilities_exposed, max_depth_m, mean_depth_m, confidence
        FROM impact_assessments
        WHERE zone_id = fz.id
        ORDER BY assessed_at DESC LIMIT 1
      ) ia ON TRUE
      ${whereClause}
      GROUP BY fz.id, wr.rainfall_1h, wr.rainfall_24h, wr.temperature,
               wr.humidity, wr.weather_desc, p.flood_probability, p.recommendation,
               ia.population_exposed, ia.buildings_exposed, ia.roads_km_exposed,
               ia.schools_exposed, ia.health_facilities_exposed, ia.max_depth_m,
               ia.mean_depth_m, ia.confidence
      ORDER BY fz.risk_level DESC, fz.risk_score DESC
      LIMIT $${params.length}
    `, params);

    const enrichedRows = rows.map(zone => ({
      ...zone,
      operational_risk: computeOperationalRisk({
        zone,
        weather: zone,
        prediction: { flood_probability: zone.last_prediction_score || zone.risk_score },
        impact: zone,
      })
    }));

    const response = {
      success: true,
      count: enrichedRows.length,
      data: enrichedRows,
      last_update: new Date().toISOString()
    };

    await cacheSet(cacheKey, response, 300); // 5 min cache
    res.json(response);

  } catch (err) { next(err); }
};

// GET /api/zones/:id
exports.getZoneById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `api:zones:${id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const { rows } = await query(`
      SELECT
        fz.*,
        ST_AsGeoJSON(fz.geometry)::json AS geometry,
        ST_AsText(ST_Centroid(fz.geometry)) AS centroid_wkt
      FROM flood_zones fz
      WHERE fz.id = $1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Zone introuvable' });
    }

    // Récupérer les 30 derniers jours de météo pour le graphique
    const { rows: weatherHistory } = await query(`
      SELECT
        DATE_TRUNC('day', timestamp) AS day,
        COALESCE(SUM(rainfall_1h), 0) AS daily_rainfall,
        COALESCE(AVG(temperature), 0) AS avg_temp,
        COALESCE(AVG(humidity), 0)    AS avg_humidity
      FROM weather_readings
      WHERE zone_id = $1 AND timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY day ASC
    `, [id]);

    // Dernières prédictions
    const { rows: predictions } = await query(`
      SELECT flood_probability, risk_level, predicted_at, recommendation, model_version
      FROM predictions
      WHERE zone_id = $1
      ORDER BY predicted_at DESC
      LIMIT 10
    `, [id]);

    const response = {
      success: true,
      data: {
        ...rows[0],
        weather_history:  weatherHistory,
        recent_predictions: predictions,
      }
    };

    await cacheSet(cacheKey, response, 120); // 2 min cache
    res.json(response);

  } catch (err) { next(err); }
};

// GET /api/zones/:id/history — Historique des inondations
exports.getZoneHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 20 } = req.query;

    const { rows } = await query(`
      SELECT id, event_date, severity, deaths, injured, displaced,
             houses_dmg, source, confirmed, notes, created_at
      FROM flood_events
      WHERE zone_id = $1
      ORDER BY event_date DESC
      LIMIT $2
    `, [id, Math.min(parseInt(limit), 50)]);

    res.json({ success: true, count: rows.length, data: rows });

  } catch (err) { next(err); }
};

// GET /api/zones/:id/weather — Météo actuelle + prévisions
exports.getZoneWeather = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: current } = await query(`
      SELECT * FROM weather_readings
      WHERE zone_id = $1
      ORDER BY timestamp DESC LIMIT 1
    `, [id]);

    const { rows: forecasts } = await query(`
      SELECT * FROM weather_forecasts
      WHERE zone_id = $1 AND forecast_time >= NOW()
      ORDER BY forecast_time ASC LIMIT 8
    `, [id]);

    res.json({
      success: true,
      data: {
        current: current[0] || null,
        forecasts,
        updated_at: new Date().toISOString()
      }
    });

  } catch (err) { next(err); }
};
