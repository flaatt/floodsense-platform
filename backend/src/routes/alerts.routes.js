const router = require('express').Router();
const ctrl = require('../controllers/alerts.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
router.get('/',       ctrl.getAlerts);
router.get('/active', ctrl.getActiveAlerts);
router.post('/', authenticate, requireRole('admin','operator'), validate(schemas.createAlert), ctrl.createAlert);
router.patch('/:id/acknowledge', authenticate, ctrl.acknowledgeAlert);
module.exports = router;
