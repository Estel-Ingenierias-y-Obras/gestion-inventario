const express = require('express');
const authenticate = require('../middleware/auth');
const { requireWhitelist, requireAdmin } = require('../middleware/whitelist');
const validateRequest = require('../middleware/validateRequest');
const authenticateAutomationOrAdmin = require('../middleware/automationAuth');
const {
  listEmailSchedules, listPendingSchedules, createEmailSchedule, deleteEmailSchedule, sendScheduledReport, testGraph,
} = require('../controllers/emailScheduleController');
const { createEmailScheduleValidator, emailScheduleIdValidator } = require('../validators/emailScheduleValidators');

const router = express.Router();

router.get('/pending', authenticateAutomationOrAdmin, listPendingSchedules);
router.post('/:id/send', authenticateAutomationOrAdmin, emailScheduleIdValidator, validateRequest, sendScheduledReport);
router.use(authenticate, requireWhitelist, requireAdmin);
router.post('/test-graph', testGraph);
router.get('/', listEmailSchedules);
router.post('/', createEmailScheduleValidator, validateRequest, createEmailSchedule);
router.delete('/:id', emailScheduleIdValidator, validateRequest, deleteEmailSchedule);

module.exports = router;
