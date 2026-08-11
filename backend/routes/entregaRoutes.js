const express = require('express');
const { crearEntrega, obtenerEntregas, obtenerEstadisticas } = require('../controllers/entregaController');
const authenticate = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const { createEntregaValidator } = require('../validators/entregaValidators');

const router = express.Router();

router.get('/', authenticate, obtenerEntregas);
router.get('/stats', authenticate, obtenerEstadisticas);
router.post('/', authenticate, createEntregaValidator, validateRequest, crearEntrega);

module.exports = router;
