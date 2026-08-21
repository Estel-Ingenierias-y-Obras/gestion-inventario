const { body, param } = require('express-validator');

const createMaterialOrderValidator = [
  body('material').trim().isLength({ min: 2, max: 100 }).withMessage('El material debe tener entre 2 y 100 caracteres.'),
  body('modelo').trim().isLength({ min: 1, max: 100 }).withMessage('El modelo es obligatorio y debe tener máximo 100 caracteres.'),
  body('cantidadInicial').isInt({ min: 1, max: 1000000 }).withMessage('Las unidades deben ser un número entero mayor que cero.'),
  body('numeroPedido').trim().isLength({ min: 1, max: 100 }).withMessage('El número de pedido es obligatorio.'),
  body('recibido').isBoolean().withMessage('El estado de recepción debe ser verdadero o falso.').toBoolean(),
];

const materialOrderIdValidator = [
  param('id').isMongoId().withMessage('Identificador de pedido no válido.'),
];

const updateMaterialOrderValidator = [
  ...materialOrderIdValidator,
  ...createMaterialOrderValidator,
];

module.exports = { createMaterialOrderValidator, materialOrderIdValidator, updateMaterialOrderValidator };
