const { query } = require('../config/database');

exports.exportZonesGeoJSON = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(jsonb_build_object(
          'type', 'Feature',
          'id', fz.id,
          'geometry', ST_AsGeoJSON(fz.geometry)::jsonb,
          'properties', to_jsonb(fz) - 'geometry'
        )), '[]'::jsonb)
      ) AS geojson
      FROM flood_zones fz
    `);
    res.setHeader('Content-Type', 'application/geo+json');
    res.setHeader('Content-Disposition', 'attachment; filename="floodsense_zones.geojson"');
    res.json(rows[0].geojson);
  } catch (err) { next(err); }
};

exports.exportDashboardCSV = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT fz.id, fz.commune, fz.risk_level, fz.risk_score, fz.population,
             COALESCE(ia.population_exposed,0) AS population_exposed,
             COALESCE(ia.buildings_exposed,0) AS buildings_exposed,
             COALESCE(ia.max_depth_m,0) AS max_depth_m,
             fz.last_updated
      FROM flood_zones fz
      LEFT JOIN LATERAL (
        SELECT * FROM impact_assessments WHERE zone_id=fz.id ORDER BY assessed_at DESC LIMIT 1
      ) ia ON TRUE
      ORDER BY fz.risk_score DESC
    `);
    const header = Object.keys(rows[0] || { id: '', commune: '' });
    const csv = [header.join(','), ...rows.map(r => header.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="floodsense_dashboard.csv"');
    res.send(csv);
  } catch (err) { next(err); }
};
