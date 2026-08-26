const express = require('express');
const authenticate = require('../middleware/auth');
const { requireWhitelist, requireAdmin } = require('../middleware/whitelist');
const validateRequest = require('../middleware/validateRequest');
const { listRecipients, createRecipient, deleteRecipient } = require('../controllers/deliveryNotificationRecipientController');
const { createRecipientValidator, recipientIdValidator } = require('../validators/deliveryNotificationRecipientValidators');

const router = express.Router();
router.use(authenticate, requireWhitelist, requireAdmin);
router.get('/', listRecipients);
router.post('/', createRecipientValidator, validateRequest, createRecipient);
router.delete('/:id', recipientIdValidator, validateRequest, deleteRecipient);

module.exports = router;
