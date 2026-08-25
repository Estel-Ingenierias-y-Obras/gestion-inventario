const { body, param } = require('express-validator');

const createEntregaValidator = [
  body('material').trim().isLength({ min: 2, max: 100 }).withMessage('El material es obligatorio y debe tener entre 2 y 100 caracteres.'),
  body('modelo').trim().isLength({ min: 1, max: 100 }).withMessage('El modelo es obligatorio y debe tener máximo 100 caracteres.'),
  body('numeroSerie').optional({ nullable: true }).trim().isLength({ max: 150 }).withMessage('El número de serie no puede superar 150 caracteres.'),
  body('cantidad').isInt({ min: 1, max: 1000000 }).withMessage('La cantidad debe ser un número entero mayor que cero.'),
  body('personId').isMongoId().withMessage('Debes seleccionar una persona existente.'),
  body('departmentId').isMongoId().withMessage('El departamento asociado no es válido.'),
];

const deleteEntregaValidator = [
  param('id').isMongoId().withMessage('El identificador de la entrega no es válido.'),
];

module.exports = {
  createEntregaValidator,
  deleteEntregaValidator,
};
