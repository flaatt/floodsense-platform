// ─────────────────────────────────────────────────────────────
//  src/controllers/alerts.controller.js
// ─────────────────────────────────────────────────────────────
const { query } = require('../config/database');
const { createAndSendAlert } = require('../services/alertService');

// GET /api/alerts
exports.getAlerts = async (req, res, next) => {
  try {
    const { zone_id, alert_type, limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    if (zone_id)    { params.push(parseInt(zone_id));   where += ` AND a.zone_id = $${params.length}`; }
    if (alert_type) { params.push(alert_type);           where += ` AND a.alert_type = $${params.length}`; }

    params.push(Math.min(parseInt(limit), 100));
    params.push(parseInt(offset));

    const { rows } = await query(`
      SELECT
        a.*, fz.commune, fz.quartier,
        fz.risk_level AS current_risk_level
      FROM alerts a
      LEFT JOIN flood_zones fz ON fz.id = a.zone_id
      ${where}
      ORDER BY a.sent_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    // Compter total pour pagination
    const countParams = params.slice(0, -2);
    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM alerts a ${where}`, countParams
    );

    res.json({
      success: true,
      count: rows.length,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      data: rows
    });

  } catch (err) { next(err); }
};

// GET /api/alerts/active
exports.getActiveAlerts = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT a.*, fz.commune, fz.quartier, fz.population
      FROM alerts a
      JOIN flood_zones fz ON fz.id = a.zone_id
      WHERE a.sent_at >= NOW() - INTERVAL '24 hours'
        AND a.alert_type IN ('warning', 'emergency')
      ORDER BY a.sent_at DESC
    `);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { next(err); }
};

// POST /api/alerts — Créer une alerte manuelle (admin)
exports.createAlert = async (req, res, next) => {
  try {
    const { zone_id, alert_type, message_fr, message_ln, channels } = req.body;

    const { rows: zones } = await query('SELECT * FROM flood_zones WHERE id = $1', [zone_id]);
    if (zones.length === 0) {
      return res.status(404).json({ success: false, error: 'Zone introuvable' });
    }

    const fakePrediction = {
      flood_probability: alert_type === 'emergency' ? 0.9 : alert_type === 'warning' ? 0.6 : 0.3,
      risk_level:        alert_type === 'emergency' ? 4   : alert_type === 'warning' ? 3   : 2,
      recommendation:    message_fr
    };

    const alert = await createAndSendAlert({
      zone: zones[0],
      prediction: fakePrediction,
      channels: channels || ['web', 'email'],
      sentBy: req.user?.username || 'admin'
    });

    // Audit log
    await query(`
      INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip_address)
      VALUES ($1, 'CREATE_ALERT', 'alerts', $2, $3, $4)
    `, [req.user?.id, alert?.id, JSON.stringify({ zone_id, alert_type }), req.ip]);

    res.status(201).json({ success: true, data: alert });

  } catch (err) { next(err); }
};

// PATCH /api/alerts/:id/acknowledge
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      UPDATE alerts
      SET acknowledged = TRUE, acknowledged_at = NOW()
      WHERE id = $1 RETURNING *
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Alerte introuvable' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};
