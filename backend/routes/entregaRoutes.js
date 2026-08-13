const express = require('express');
const { crearEntrega, eliminarEntrega, obtenerEntregas, obtenerEstadisticas } = require('../controllers/entregaController');
const authenticate = require('../middleware/auth');
const { requireWhitelist } = require('../middleware/whitelist');
const validateRequest = require('../middleware/validateRequest');
const { createEntregaValidator, deleteEntregaValidator } = require('../validators/entregaValidators');

const router = express.Router();

router.use(authenticate, requireWhitelist);
router.get('/', obtenerEntregas);
router.get('/stats', obtenerEstadisticas);
router.post('/', createEntregaValidator, validateRequest, crearEntrega);
router.delete('/:id', deleteEntregaValidator, validateRequest, eliminarEntrega);

module.exports = router;
