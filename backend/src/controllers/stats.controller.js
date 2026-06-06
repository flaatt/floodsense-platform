// ─────────────────────────────────────────────────────────────
//  src/controllers/stats.controller.js
// ─────────────────────────────────────────────────────────────
const { query } = require('../config/database');
const { cacheGet, cacheSet } = require('../config/redis');

// GET /api/stats/dashboard — Toutes les stats pour le dashboard admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    const cacheKey = 'api:stats:dashboard';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    // Exécuter toutes les requêtes en parallèle
    const [
      riskDistribution,
      alertsToday,
      populationAtRisk,
      recentEvents,
      rainfallTrend,
      topRiskZones
    ] = await Promise.all([

      // Distribution des niveaux de risque
      query(`
        SELECT risk_level, COUNT(*) AS zone_count,
               SUM(population) AS total_population
        FROM flood_zones
        GROUP BY risk_level ORDER BY risk_level
      `),

      // Alertes des dernières 24h
      query(`
        SELECT alert_type, COUNT(*) AS count
        FROM alerts
        WHERE sent_at >= NOW() - INTERVAL '24 hours'
        GROUP BY alert_type
      `),

      // Population en risque élevé/critique
      query(`
        SELECT SUM(population) AS total
        FROM flood_zones
        WHERE risk_level >= 3
      `),

      // 5 derniers événements
      query(`
        SELECT fe.*, fz.commune
        FROM flood_events fe
        JOIN flood_zones fz ON fz.id = fe.zone_id
        ORDER BY fe.event_date DESC LIMIT 5
      `),

      // Tendance pluie 7 derniers jours
      query(`
        SELECT
          DATE_TRUNC('day', timestamp) AS day,
          COALESCE(MAX(rainfall_1h), 0) AS max_rainfall,
          COALESCE(AVG(rainfall_1h), 0) AS avg_rainfall
        FROM weather_readings
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY DATE_TRUNC('day', timestamp)
        ORDER BY day ASC
      `),

      // Top 5 zones les plus à risque
      query(`
        SELECT id, commune, risk_level, risk_score, population
        FROM flood_zones
        WHERE risk_level >= 2
        ORDER BY risk_score DESC LIMIT 5
      `),
    ]);

    const response = {
      success: true,
      data: {
        risk_distribution:  riskDistribution.rows,
        alerts_today:       alertsToday.rows,
        population_at_risk: parseInt(populationAtRisk.rows[0]?.total || 0),
        recent_events:      recentEvents.rows,
        rainfall_trend:     rainfallTrend.rows,
        top_risk_zones:     topRiskZones.rows,
        generated_at:       new Date().toISOString()
      }
    };

    await cacheSet(cacheKey, response, 600); // 10 min
    res.json(response);

  } catch (err) { next(err); }
};

// GET /api/stats/flood-history?years=3
exports.getFloodHistory = async (req, res, next) => {
  try {
    const { years = 3 } = req.query;
    const { rows } = await query(`
      SELECT
        EXTRACT(YEAR FROM event_date) AS year,
        EXTRACT(MONTH FROM event_date) AS month,
        COUNT(*) AS events_count,
        SUM(deaths) AS total_deaths,
        SUM(displaced) AS total_displaced,
        MAX(severity) AS max_severity
      FROM flood_events
      WHERE event_date >= NOW() - ($1 || ' years')::interval
      GROUP BY year, month
      ORDER BY year DESC, month DESC
    `, [Math.min(parseInt(years), 10)]);

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { next(err); }
};

// GET /api/stats/summary
exports.getSummary = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        (SELECT COUNT(*) FROM flood_zones)                AS total_zones,
        (SELECT COUNT(*) FROM flood_zones WHERE risk_level >= 3) AS high_risk_zones,
        (SELECT COUNT(*) FROM flood_zones WHERE risk_level = 4)  AS critical_zones,
        (SELECT SUM(population) FROM flood_zones WHERE risk_level >= 3) AS population_at_risk,
        (SELECT COUNT(*) FROM alerts WHERE sent_at >= NOW() - INTERVAL '24h') AS alerts_24h,
        (SELECT COUNT(*) FROM flood_events WHERE event_date >= CURRENT_DATE - 30) AS events_30d,
        (SELECT MAX(last_updated) FROM flood_zones) AS last_prediction_update
    `);
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};
