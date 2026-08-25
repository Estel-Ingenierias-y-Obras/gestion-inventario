const { body, param } = require('express-validator');

const id = (name) => param(name).isMongoId().withMessage(`El identificador ${name} no es válido.`);
const personName = body('nombreCompleto').trim().isLength({ min: 2, max: 150 })
  .withMessage('El nombre completo debe tener entre 2 y 150 caracteres.');

const departmentIdValidator = [id('departmentId')];
const createPersonValidator = [id('departmentId'), personName];
const personIdValidator = [id('personId')];
const updatePersonValidator = [id('personId'), personName];
const assignmentIdValidator = [id('personId'), id('assignmentId')];
const createAssignmentValidator = [
  id('personId'),
  body('origen').optional().equals('manual').withMessage('El material de una persona debe ser manual.'),
  body('material').trim().isLength({ min: 2, max: 100 }).withMessage('El material es obligatorio.'),
  body('modelo').trim().isLength({ min: 1, max: 100 }).withMessage('El modelo es obligatorio.'),
  body('cantidad').isInt({ min: 1, max: 10000 }).withMessage('La cantidad debe ser un entero positivo.'),
  body('numeroSerie').optional({ nullable: true }).trim().isLength({ max: 150 }),
];
const updateSerialValidator = [
  id('personId'), id('assignmentId'),
  body('numeroSerie').optional({ nullable: true }).trim().isLength({ max: 150 }),
];

module.exports = {
  departmentIdValidator, createPersonValidator, personIdValidator, updatePersonValidator,
  assignmentIdValidator, createAssignmentValidator, updateSerialValidator,
};
