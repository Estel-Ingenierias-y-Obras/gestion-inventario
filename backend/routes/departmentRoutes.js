const express = require('express');
const authenticate = require('../middleware/auth');
const { requireWhitelist, requireAdmin } = require('../middleware/whitelist');
const validateRequest = require('../middleware/validateRequest');
const { listDepartments } = require('../controllers/departmentController');
const { createDepartmentValidator, deleteDepartmentValidator } = require('../validators/departmentValidators');
const manualDirectoryDisabled = require('../middleware/manualDirectoryDisabled');

const router = express.Router();

router.use(authenticate, requireWhitelist);
router.get('/', listDepartments);
router.post('/', requireAdmin, createDepartmentValidator, validateRequest, manualDirectoryDisabled);
router.delete('/:id', requireAdmin, deleteDepartmentValidator, validateRequest, manualDirectoryDisabled);

module.exports = router;
