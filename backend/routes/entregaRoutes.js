const express = require('express');
const { crearEntrega, eliminarEntrega, obtenerEntregas, obtenerEstadisticas } = require('../controllers/entregaController');
const authenticate = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const { createEntregaValidator, deleteEntregaValidator } = require('../validators/entregaValidators');

const router = express.Router();

router.get('/', authenticate, obtenerEntregas);
router.get('/stats', authenticate, obtenerEstadisticas);
router.post('/', authenticate, createEntregaValidator, validateRequest, crearEntrega);
router.delete('/:id', authenticate, deleteEntregaValidator, validateRequest, eliminarEntrega);

module.exports = router;
