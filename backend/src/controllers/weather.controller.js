// ─────────────────────────────────────────────────────────────
//  src/controllers/weather.controller.js
// ─────────────────────────────────────────────────────────────
const { query } = require('../config/database');
const { fetchCurrentWeather, fetchForecast } = require('../services/weatherService');
const { cacheGet, cacheSet } = require('../config/redis');

// GET /api/weather/current — Vue globale météo Kinshasa
exports.getCurrentWeather = async (req, res, next) => {
  try {
    const cacheKey = 'api:weather:current:all';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const { rows } = await query(`
      SELECT DISTINCT ON (zone_id)
        wr.zone_id, fz.commune,
        wr.rainfall_1h, wr.rainfall_24h, wr.temperature,
        wr.humidity, wr.wind_speed, wr.weather_desc, wr.timestamp
      FROM weather_readings wr
      JOIN flood_zones fz ON fz.id = wr.zone_id
      ORDER BY zone_id, timestamp DESC
    `);

    // Stats globales Kinshasa
    const maxRain = rows.reduce((max, r) => Math.max(max, r.rainfall_1h || 0), 0);
    const avgTemp = rows.reduce((s, r) => s + (r.temperature || 0), 0) / (rows.length || 1);
    const alertZones = rows.filter(r => (r.rainfall_1h || 0) > 20).length;

    const response = {
      success: true,
      summary: {
        max_rainfall_1h: maxRain,
        avg_temperature: parseFloat(avgTemp.toFixed(1)),
        alert_zones_count: alertZones,
        updated_at: new Date().toISOString()
      },
      data: rows
    };

    await cacheSet(cacheKey, response, 600);
    res.json(response);

  } catch (err) { next(err); }
};

// GET /api/weather/kinshasa — Météo globale ville (depuis OWM)
exports.getKinshasaWeather = async (req, res, next) => {
  try {
    const weather = await fetchCurrentWeather('Gombe'); // Centre-ville
    const forecast = await fetchForecast('Gombe');

    res.json({
      success: true,
      data: { current: weather, forecast: forecast.forecast?.slice(0, 8) }
    });

  } catch (err) { next(err); }
};

// GET /api/weather/history?days=7
exports.getWeatherHistory = async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days || 7), 30);
    const { zone_id } = req.query;

    let sql = `
      SELECT
        DATE_TRUNC('hour', timestamp) AS hour,
        COALESCE(AVG(rainfall_1h), 0)  AS avg_rainfall,
        COALESCE(MAX(rainfall_1h), 0)  AS max_rainfall,
        COALESCE(AVG(temperature), 0)  AS avg_temp,
        COALESCE(AVG(humidity), 0)     AS avg_humidity,
        COUNT(*)                        AS readings
      FROM weather_readings
      WHERE timestamp >= NOW() - ($1 || ' days')::interval
    `;
    const params = [days];

    if (zone_id) {
      params.push(parseInt(zone_id));
      sql += ` AND zone_id = $${params.length}`;
    }

    sql += ' GROUP BY DATE_TRUNC(\'hour\', timestamp) ORDER BY hour DESC';

    const { rows } = await query(sql, params);
    res.json({ success: true, count: rows.length, data: rows });

  } catch (err) { next(err); }
};
