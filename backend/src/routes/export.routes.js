const router = require('express').Router();
const ctrl = require('../controllers/export.controller');
router.get('/zones.geojson', ctrl.exportZonesGeoJSON);
router.get('/dashboard.csv', ctrl.exportDashboardCSV);
module.exports = router;
