const { body, param } = require('express-validator');

const createEntregaValidator = [
  body('personId').isMongoId().withMessage('Debes seleccionar una persona existente.'),
  body('departmentId').isMongoId().withMessage('El departamento asociado no es válido.'),
  body('items').isArray({ min: 1, max: 100 }).withMessage('Debes añadir al menos un material.'),
  body('items.*.material').trim().isLength({ min: 2, max: 100 }).withMessage('Cada material debe tener entre 2 y 100 caracteres.'),
  body('items.*.modelo').trim().isLength({ min: 1, max: 100 }).withMessage('Cada modelo es obligatorio y debe tener máximo 100 caracteres.'),
  body('items.*.numeroSerie').optional({ nullable: true }).trim().isLength({ max: 150 }).withMessage('El número de serie no puede superar 150 caracteres.'),
  body('items.*.cantidad').isInt({ min: 1, max: 1000000 }).withMessage('Cada cantidad debe ser un número entero mayor que cero.'),
];

const deleteEntregaValidator = [
  param('id').isMongoId().withMessage('El identificador de la entrega no es válido.'),
];

module.exports = {
  createEntregaValidator,
  deleteEntregaValidator,
};
