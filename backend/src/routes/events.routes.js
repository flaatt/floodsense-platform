const router = require('express').Router();
const ctrl = require('../controllers/events.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
router.get('/',    ctrl.getEvents);
router.post('/',   authenticate, validate(schemas.reportEvent), ctrl.createEvent);
router.patch('/:id/confirm', authenticate, requireRole('admin','operator'), ctrl.confirmEvent);
module.exports = router;
