const express = require('express');
const authenticate = require('../middleware/auth');
const authenticateEntraAutomationOrAdmin = require('../middleware/entraAutomationAuth');
const { requireWhitelist, requireAdmin } = require('../middleware/whitelist');
const { automationLimiter } = require('../middleware/rateLimiters');
const controller = require('../controllers/entraSyncController');

const router = express.Router();

router.post('/simulations', automationLimiter, authenticateEntraAutomationOrAdmin, controller.startSimulation);
router.post('/catalog', automationLimiter, authenticateEntraAutomationOrAdmin, controller.synchronizeEntraCatalog);
router.use(authenticate, requireWhitelist, requireAdmin);
router.get('/simulations', controller.listSimulations);
router.get('/simulations/:runId', controller.getSimulation);
router.get('/simulations/:runId/items', controller.listSimulationItems);

module.exports = router;
