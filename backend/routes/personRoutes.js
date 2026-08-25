const express = require('express');
const authenticate = require('../middleware/auth');
const { requireWhitelist, requireAdmin } = require('../middleware/whitelist');
const validateRequest = require('../middleware/validateRequest');
const controller = require('../controllers/personController');
const validators = require('../validators/personValidators');

const router = express.Router();
router.use(authenticate, requireWhitelist, requireAdmin);
router.get('/departments/:departmentId', validators.departmentIdValidator, validateRequest, controller.getDepartment);
router.get('/departments/:departmentId/people', validators.departmentIdValidator, validateRequest, controller.listPeople);
router.post('/departments/:departmentId/people', validators.createPersonValidator, validateRequest, controller.createPerson);
router.put('/people/:personId', validators.updatePersonValidator, validateRequest, controller.updatePerson);
router.delete('/people/:personId', validators.personIdValidator, validateRequest, controller.deletePerson);
router.get('/people/:personId/materials', validators.personIdValidator, validateRequest, controller.listAssignments);
router.post('/people/:personId/materials', validators.createAssignmentValidator, validateRequest, controller.createAssignment);
router.patch('/people/:personId/materials/:assignmentId/serial', validators.updateSerialValidator, validateRequest, controller.updateAssignmentSerial);
router.delete('/people/:personId/materials/:assignmentId', validators.assignmentIdValidator, validateRequest, controller.removeAssignment);

module.exports = router;
