const router = require('express').Router();
const ctrl = require('../controllers/impact.controller');
const { authenticate, requireRole } = require('../middleware/auth');
router.get('/city', ctrl.getCityImpact);
router.get('/zones/:id', ctrl.getZoneImpact);
router.post('/run', authenticate, requireRole('admin','operator'), ctrl.runImpactAssessment);
module.exports = router;
