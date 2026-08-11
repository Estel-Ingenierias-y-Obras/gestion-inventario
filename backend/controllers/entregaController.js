const Entrega = require('../models/Entrega');

const normalizeString = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const isValidPositiveNumber = (value) => {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
};

const crearEntrega = async (req, res) => {
  try {
    const { material, modelo, cantidad, receptor, departamento } = req.body;
    const usuario = req.user || {};
    const entregadoPor = normalizeString(usuario.name || usuario.email || 'Usuario autenticado');

    const datosLimpiados = {
      material: normalizeString(material),
      modelo: normalizeString(modelo),
      cantidad,
      receptor: normalizeString(receptor),
      departamento: normalizeString(departamento),
      entregadoPor,
    };

    if (!datosLimpiados.material || !datosLimpiados.modelo || !datosLimpiados.receptor || !datosLimpiados.departamento) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos de texto son obligatorios y no pueden estar vacíos.',
      });
    }

    if (!isValidPositiveNumber(datosLimpiados.cantidad)) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser un número positivo.',
      });
    }

    const nuevaEntrega = new Entrega(datosLimpiados);
    const entregaGuardada = await nuevaEntrega.save();

    return res.status(201).json({
      success: true,
      data: entregaGuardada,
    });
  } catch (error) {
    console.error('Error al crear entrega:', error.message);
    return res.status(500).json({
      success: false,
      message: 'No se pudo crear la entrega.',
    });
  }
};

const obtenerEntregas = async (req, res) => {
  try {
    const entregas = await Entrega.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: entregas,
    });
  } catch (error) {
    console.error('Error al obtener entregas:', error.message);
    return res.status(500).json({
      success: false,
      message: 'No se pudieron obtener las entregas.',
    });
  }
};

module.exports = {
  crearEntrega,
  obtenerEntregas,
};
