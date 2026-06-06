const router = require('express').Router();
const ctrl = require('../controllers/operations.controller');
router.get('/command-center', ctrl.getCommandCenter);
router.get('/data-quality', ctrl.getDataQuality);
module.exports = router;
