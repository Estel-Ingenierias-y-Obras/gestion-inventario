const { body, param } = require('express-validator');

const createRecipientValidator = [
  body('email').trim().isEmail().withMessage('Introduce un correo electrónico válido.')
    .isLength({ max: 254 }).withMessage('El correo electrónico no puede superar 254 caracteres.'),
];
const recipientIdValidator = [param('id').isMongoId().withMessage('El destinatario no es válido.')];

module.exports = { createRecipientValidator, recipientIdValidator };
