const express = require('express');
const authenticate = require('../middleware/auth');
const { requireWhitelist, requireAdmin } = require('../middleware/whitelist');
const validateRequest = require('../middleware/validateRequest');
const { listDepartments, createDepartment, deleteDepartment } = require('../controllers/departmentController');
const { createDepartmentValidator, deleteDepartmentValidator } = require('../validators/departmentValidators');

const router = express.Router();

router.use(authenticate, requireWhitelist);
router.get('/', listDepartments);
router.post('/', requireAdmin, createDepartmentValidator, validateRequest, createDepartment);
router.delete('/:id', requireAdmin, deleteDepartmentValidator, validateRequest, deleteDepartment);

module.exports = router;
