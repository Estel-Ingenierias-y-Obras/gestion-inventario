const express = require('express');
const authenticate = require('../middleware/auth');
const { requireWhitelist, requireAdmin } = require('../middleware/whitelist');
const validateRequest = require('../middleware/validateRequest');
const controller = require('../controllers/personController');
const validators = require('../validators/personValidators');
const manualDirectoryDisabled = require('../middleware/manualDirectoryDisabled');

const router = express.Router();
router.use(authenticate, requireWhitelist);
router.get('/people/catalog', controller.listPeopleCatalog);
router.use(requireAdmin);
router.get('/people/deactivation-pending', controller.listPendingDeactivations);
router.post('/people/:personId/confirm-deactivation', validators.personIdValidator, validateRequest, controller.confirmDeactivation);
router.get('/departments/:departmentId', validators.departmentIdValidator, validateRequest, controller.getDepartment);
router.get('/departments/:departmentId/people', validators.departmentIdValidator, validateRequest, controller.listPeople);
router.post('/departments/:departmentId/people', validators.createPersonValidator, validateRequest, manualDirectoryDisabled);
router.put('/people/:personId', validators.updatePersonValidator, validateRequest, manualDirectoryDisabled);
router.delete('/people/:personId', validators.personIdValidator, validateRequest, manualDirectoryDisabled);
router.get('/people/:personId/materials', validators.personIdValidator, validateRequest, controller.listAssignments);
router.post('/people/:personId/materials', validators.createAssignmentValidator, validateRequest, controller.createAssignment);
router.patch('/people/:personId/materials/:assignmentId/serial', validators.updateSerialValidator, validateRequest, controller.updateAssignmentSerial);
router.delete('/people/:personId/materials/:assignmentId/undo', validators.assignmentIdValidator, validateRequest, controller.undoPersonAssignment);
router.delete('/people/:personId/materials/:assignmentId', validators.assignmentIdValidator, validateRequest, controller.removeAssignment);

module.exports = router;
