const router = require('express').Router();
const ctrl = require('../controllers/zones.controller');
router.get('/',            ctrl.getAllZones);
router.get('/:id',         ctrl.getZoneById);
router.get('/:id/history', ctrl.getZoneHistory);
router.get('/:id/weather', ctrl.getZoneWeather);
module.exports = router;
