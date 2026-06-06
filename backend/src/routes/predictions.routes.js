const router = require('express').Router();
const ctrl = require('../controllers/predictions.controller');
const { authenticate, requireRole } = require('../middleware/auth');
router.get('/current',         ctrl.getCurrentPredictions);
router.get('/model',           ctrl.getModelInfo);
router.get('/history/:zoneId', ctrl.getPredictionHistory);
router.post('/trigger', authenticate, requireRole('admin','operator'), ctrl.triggerPredictions);
module.exports = router;
