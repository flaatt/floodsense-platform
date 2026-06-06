const router = require('express').Router();
const ctrl = require('../controllers/weather.controller');
router.get('/current',  ctrl.getCurrentWeather);
router.get('/kinshasa', ctrl.getKinshasaWeather);
router.get('/history',  ctrl.getWeatherHistory);
module.exports = router;
