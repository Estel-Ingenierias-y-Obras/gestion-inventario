const express = require('express');
const authenticate = require('../middleware/auth');
const { requireWhitelist, requireAdmin } = require('../middleware/whitelist');
const validateRequest = require('../middleware/validateRequest');
const { getAccessStatus, listWhitelistUsers, addWhitelistUser, deleteWhitelistUser } = require('../controllers/whitelistController');
const { createWhitelistUserValidator, deleteWhitelistUserValidator } = require('../validators/whitelistValidators');

const router = express.Router();

router.get('/access', authenticate, requireWhitelist, getAccessStatus);
router.get('/', authenticate, requireWhitelist, requireAdmin, listWhitelistUsers);
router.post('/', authenticate, requireWhitelist, requireAdmin, createWhitelistUserValidator, validateRequest, addWhitelistUser);
router.delete('/:id', authenticate, requireWhitelist, requireAdmin, deleteWhitelistUserValidator, validateRequest, deleteWhitelistUser);

module.exports = router;
