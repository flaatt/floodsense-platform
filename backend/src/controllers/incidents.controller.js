const { query } = require('../config/database');
const { emitAlert } = require('../utils/socket');

exports.getIncidents = async (req, res, next) => {
  try {
    const { status, zone_id, limit = 100 } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (status) { params.push(status); where += ` AND cr.status = $${params.length}`; }
    if (zone_id) { params.push(Number(zone_id)); where += ` AND cr.zone_id = $${params.length}`; }
    params.push(Math.min(Number(limit), 250));

    const { rows } = await query(`
      SELECT cr.*, fz.commune, ST_AsGeoJSON(cr.location)::json AS geometry
      FROM citizen_reports cr
      LEFT JOIN flood_zones fz ON fz.id = cr.zone_id
      ${where}
      ORDER BY cr.reported_at DESC
      LIMIT $${params.length}
    `, params);

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { next(err); }
};

exports.createIncident = async (req, res, next) => {
  try {
    const {
      zone_id, reporter_name, reporter_phone, latitude, longitude,
      water_depth_cm = 0, road_blocked = false, house_affected = false,
      description, photo_url
    } = req.body;

    const { rows } = await query(`
      INSERT INTO citizen_reports
        (zone_id, reporter_name, reporter_phone, location, water_depth_cm,
         road_blocked, house_affected, description, photo_url, status)
      VALUES ($1,$2,$3,ST_SetSRID(ST_MakePoint($4,$5),4326),$6,$7,$8,$9,$10,'new')
      RETURNING *, ST_AsGeoJSON(location)::json AS geometry
    `, [zone_id || null, reporter_name || null, reporter_phone || null,
        Number(longitude), Number(latitude), Number(water_depth_cm),
        Boolean(road_blocked), Boolean(house_affected), description || null, photo_url || null]);

    emitAlert({ type: 'citizen_report', data: rows[0] });
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.updateIncidentStatus = async (req, res, next) => {
  try {
    const { status, verified_by } = req.body;
    const { rows } = await query(`
      UPDATE citizen_reports
      SET status=$1, verified_by=$2, verified_at=CASE WHEN $1='verified' THEN NOW() ELSE verified_at END
      WHERE id=$3
      RETURNING *
    `, [status, verified_by || req.user?.username || 'operator', req.params.id]);

    if (!rows.length) return res.status(404).json({ success: false, error: 'Signalement introuvable' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};
