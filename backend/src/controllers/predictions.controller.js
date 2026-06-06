// ─────────────────────────────────────────────────────────────
//  src/controllers/predictions.controller.js
// ─────────────────────────────────────────────────────────────
const { query } = require('../config/database');
const { cacheGet, cacheSet, cacheDelPattern } = require('../config/redis');
const { predict, getModelInfo } = require('../utils/aiClient');
const { collectAndSaveWeather } = require('../services/weatherService');
const { processRiskAlert } = require('../services/alertService');

// GET /api/predictions/current
exports.getCurrentPredictions = async (req, res, next) => {
  try {
    const cacheKey = 'api:predictions:current';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const { rows } = await query(`
      SELECT DISTINCT ON (zone_id)
        p.zone_id, p.flood_probability, p.risk_level,
        p.recommendation, p.model_version, p.predicted_at,
        fz.commune, fz.quartier, fz.population
      FROM predictions p
      JOIN flood_zones fz ON fz.id = p.zone_id
      ORDER BY zone_id, predicted_at DESC
    `);

    const summary = {
      critical_zones: rows.filter(r => r.risk_level === 4).length,
      high_zones:     rows.filter(r => r.risk_level === 3).length,
      medium_zones:   rows.filter(r => r.risk_level === 2).length,
      low_zones:      rows.filter(r => r.risk_level === 1).length,
      total_at_risk:  rows.filter(r => r.risk_level >= 3)
                         .reduce((s, r) => s + (parseInt(r.population) || 0), 0),
    };

    const response = { success: true, summary, data: rows };
    await cacheSet(cacheKey, response, 300);
    res.json(response);

  } catch (err) { next(err); }
};

// POST /api/predictions/trigger — Forcer un recalcul (admin)
exports.triggerPredictions = async (req, res, next) => {
  try {
    const { zone_ids } = req.body; // optionnel: filtrer sur certaines zones

    const { rows: zones } = await query(
      zone_ids?.length
        ? 'SELECT * FROM flood_zones WHERE id = ANY($1)'
        : 'SELECT * FROM flood_zones ORDER BY risk_level DESC',
      zone_ids?.length ? [zone_ids] : []
    );

    const results = [];
    for (const zone of zones) {
      const weather = await collectAndSaveWeather(zone);
      const prediction = await predict(zone, weather || {});

      await query(`
        INSERT INTO predictions (zone_id, flood_probability, risk_level, recommendation)
        VALUES ($1, $2, $3, $4)
      `, [zone.id, prediction.flood_probability, prediction.risk_level, prediction.recommendation]);

      await query(
        'UPDATE flood_zones SET risk_level=$1, risk_score=$2, last_updated=NOW() WHERE id=$3',
        [prediction.risk_level, prediction.flood_probability, zone.id]
      );

      if (prediction.risk_level >= 2) {
        await processRiskAlert(zone, prediction);
      }

      results.push({ zone_id: zone.id, commune: zone.commune, ...prediction });
    }

    await cacheDelPattern('api:*');

    res.json({
      success: true,
      message: `${results.length} zones recalculées`,
      data: results,
      triggered_at: new Date().toISOString()
    });

  } catch (err) { next(err); }
};

// GET /api/predictions/model
exports.getModelInfo = async (req, res, next) => {
  try {
    const info = await getModelInfo();
    res.json({ success: true, data: info });
  } catch (err) { next(err); }
};

// GET /api/predictions/history/:zoneId
exports.getPredictionHistory = async (req, res, next) => {
  try {
    const { zoneId } = req.params;
    const { days = 7 } = req.query;

    const { rows } = await query(`
      SELECT flood_probability, risk_level, predicted_at, recommendation
      FROM predictions
      WHERE zone_id = $1 AND predicted_at >= NOW() - ($2 || ' days')::interval
      ORDER BY predicted_at DESC
    `, [zoneId, Math.min(parseInt(days), 30)]);

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { next(err); }
};
