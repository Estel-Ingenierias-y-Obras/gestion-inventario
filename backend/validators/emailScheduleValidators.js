const { body, param } = require('express-validator');

const createEmailScheduleValidator = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Introduce un correo electrónico válido.'),
  body('frequency').isIn(['weekly', 'monthly']).withMessage('La frecuencia debe ser semanal o mensual.'),
  body('hour').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('La hora debe tener formato HH:mm.'),
  body('dayOfWeek').custom((value, { req }) => {
    if (req.body.frequency !== 'weekly') return true;
    return Number.isInteger(value) && value >= 1 && value <= 7;
  }).withMessage('Selecciona un día de la semana válido.'),
  body('dayOfMonth').custom((value, { req }) => {
    if (req.body.frequency !== 'monthly') return true;
    return Number.isInteger(value) && value >= 1 && value <= 31;
  }).withMessage('Selecciona un día del mes válido.'),
];

const emailScheduleIdValidator = [param('id').isMongoId().withMessage('Identificador de programación no válido.')];

module.exports = { createEmailScheduleValidator, emailScheduleIdValidator };
