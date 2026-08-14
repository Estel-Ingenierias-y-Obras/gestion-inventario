const express = require('express');
const authenticate = require('../middleware/auth');
const { requireWhitelist, requireAdmin } = require('../middleware/whitelist');
const validateRequest = require('../middleware/validateRequest');
const authenticateAutomationOrAdmin = require('../middleware/automationAuth');
const { automationLimiter, graphTestLimiter } = require('../middleware/rateLimiters');
const {
  listEmailSchedules, listPendingSchedules, createEmailSchedule, updateEmailSchedule, deleteEmailSchedule,
  sendScheduledReport, testGraph,
} = require('../controllers/emailScheduleController');
const {
  createEmailScheduleValidator, updateEmailScheduleValidator, emailScheduleIdValidator, sendEmailScheduleValidator,
} = require('../validators/emailScheduleValidators');

const router = express.Router();

router.get('/pending', automationLimiter, authenticateAutomationOrAdmin, listPendingSchedules);
router.post('/:id/send', automationLimiter, authenticateAutomationOrAdmin, sendEmailScheduleValidator, validateRequest, sendScheduledReport);
router.use(authenticate, requireWhitelist, requireAdmin);
router.post('/test-graph', graphTestLimiter, testGraph);
router.get('/', listEmailSchedules);
router.post('/', createEmailScheduleValidator, validateRequest, createEmailSchedule);
router.put('/:id', updateEmailScheduleValidator, validateRequest, updateEmailSchedule);
router.delete('/:id', emailScheduleIdValidator, validateRequest, deleteEmailSchedule);

module.exports = router;
