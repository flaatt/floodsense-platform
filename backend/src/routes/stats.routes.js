const router = require('express').Router();
const ctrl = require('../controllers/stats.controller');
const { authenticate } = require('../middleware/auth');
router.get('/summary',       ctrl.getSummary);
router.get('/dashboard',     authenticate, ctrl.getDashboardStats);
router.get('/flood-history', ctrl.getFloodHistory);
module.exports = router;
