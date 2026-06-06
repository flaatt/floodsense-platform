const router = require('express').Router();
const ctrl = require('../controllers/incidents.controller');
const { authenticate, requireRole } = require('../middleware/auth');
router.get('/', ctrl.getIncidents);
router.post('/', ctrl.createIncident);
router.patch('/:id/status', authenticate, requireRole('admin','operator'), ctrl.updateIncidentStatus);
module.exports = router;
