// ─────────────────────────────────────────────────────────────
//  src/controllers/events.controller.js
// ─────────────────────────────────────────────────────────────
const { query } = require('../config/database');

exports.getEvents = async (req, res, next) => {
  try {
    const { severity, confirmed, limit = 20, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = 'WHERE 1=1';

    if (severity)  { params.push(severity);          where += ` AND fe.severity = $${params.length}`; }
    if (confirmed !== undefined) { params.push(confirmed === 'true'); where += ` AND fe.confirmed = $${params.length}`; }

    params.push(Math.min(parseInt(limit), 100));
    params.push(parseInt(offset));

    const { rows } = await query(`
      SELECT fe.*, fz.commune, fz.quartier, fz.risk_level
      FROM flood_events fe
      LEFT JOIN flood_zones fz ON fz.id = fe.zone_id
      ${where}
      ORDER BY fe.event_date DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { next(err); }
};

exports.createEvent = async (req, res, next) => {
  try {
    const { zone_id, event_date, severity, deaths = 0, displaced = 0, notes, source } = req.body;

    const { rows } = await query(`
      INSERT INTO flood_events
        (zone_id, event_date, severity, deaths, displaced, notes, source, confirmed)
      VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
      RETURNING *
    `, [zone_id, event_date, severity, deaths, displaced, notes, source]);

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.confirmEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      'UPDATE flood_events SET confirmed = TRUE WHERE id = $1 RETURNING *', [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Événement introuvable' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};
