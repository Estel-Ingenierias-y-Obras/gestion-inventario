const { body, param } = require('express-validator');

const createEntregaValidator = [
  body('material').trim().isLength({ min: 2, max: 100 }).withMessage('El material es obligatorio y debe tener entre 2 y 100 caracteres.'),
  body('modelo').trim().isLength({ min: 1, max: 100 }).withMessage('El modelo es obligatorio y debe tener máximo 100 caracteres.'),
  body('cantidad').isNumeric().custom((value) => Number(value) > 0).withMessage('La cantidad debe ser un número mayor que cero.'),
  body('receptor').trim().isLength({ min: 2, max: 100 }).withMessage('El receptor es obligatorio y debe tener entre 2 y 100 caracteres.'),
  body('departamento').trim().isLength({ min: 2, max: 100 }).withMessage('El departamento es obligatorio y debe tener entre 2 y 100 caracteres.'),
];

const deleteEntregaValidator = [
  param('id').isMongoId().withMessage('El identificador de la entrega no es válido.'),
];

module.exports = {
  createEntregaValidator,
  deleteEntregaValidator,
};
