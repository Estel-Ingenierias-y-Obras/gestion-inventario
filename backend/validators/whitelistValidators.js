const { body, param } = require('express-validator');

const createWhitelistUserValidator = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.'),
  body('email').trim().toLowerCase().isEmail().withMessage('Introduce un correo electrónico válido.').isLength({ max: 254 }),
];

const deleteWhitelistUserValidator = [
  param('id').isMongoId().withMessage('Identificador de usuario inválido.'),
];

module.exports = { createWhitelistUserValidator, deleteWhitelistUserValidator };
