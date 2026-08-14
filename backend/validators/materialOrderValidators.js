const { body, param } = require('express-validator');

const createMaterialOrderValidator = [
  body('numeroCompra').trim().isLength({ min: 1, max: 100 }).withMessage('El número de compra es obligatorio.'),
  body('producto').trim().isLength({ min: 2, max: 100 }).withMessage('El producto debe tener entre 2 y 100 caracteres.'),
  body('cantidadInicial').isInt({ min: 1, max: 1000000 }).withMessage('Las unidades deben ser un número entero mayor que cero.'),
  body('proveedor').optional({ values: 'falsy' }).trim().isLength({ max: 150 }).withMessage('El proveedor no puede superar 150 caracteres.'),
  body('recibido').optional().isBoolean().withMessage('El estado de recepción no es válido.').toBoolean(),
];

const materialOrderIdValidator = [
  param('id').isMongoId().withMessage('Identificador de pedido no válido.'),
];

module.exports = { createMaterialOrderValidator, materialOrderIdValidator };
