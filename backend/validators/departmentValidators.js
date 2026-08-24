const { body, param } = require('express-validator');

const createDepartmentValidator = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre del departamento debe tener entre 2 y 100 caracteres.'),
];

const deleteDepartmentValidator = [
  param('id').isMongoId().withMessage('El identificador del departamento no es válido.'),
];

module.exports = { createDepartmentValidator, deleteDepartmentValidator };
