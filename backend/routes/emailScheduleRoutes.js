const express = require('express');
const authenticate = require('../middleware/auth');
const { requireWhitelist, requireAdmin } = require('../middleware/whitelist');
const validateRequest = require('../middleware/validateRequest');
const {
  listEmailSchedules, listPendingSchedules, createEmailSchedule, deleteEmailSchedule, sendScheduledReport,
} = require('../controllers/emailScheduleController');
const { createEmailScheduleValidator, emailScheduleIdValidator } = require('../validators/emailScheduleValidators');

const router = express.Router();

router.use(authenticate, requireWhitelist, requireAdmin);
router.get('/pending', listPendingSchedules);
router.get('/', listEmailSchedules);
router.post('/', createEmailScheduleValidator, validateRequest, createEmailSchedule);
router.post('/:id/send', emailScheduleIdValidator, validateRequest, sendScheduledReport);
router.delete('/:id', emailScheduleIdValidator, validateRequest, deleteEmailSchedule);

module.exports = router;
