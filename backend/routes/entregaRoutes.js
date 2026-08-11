const express = require('express');
const { crearEntrega, obtenerEntregas } = require('../controllers/entregaController');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, obtenerEntregas);
router.post('/', authenticate, crearEntrega);

module.exports = router;
