const Entrega = require('../models/Entrega');
const auditLogger = require('../utils/auditLogger');

const normalizeString = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const crearEntrega = async (req, res, next) => {
  try {
    const { material, modelo, cantidad, receptor, departamento } = req.body;
    const usuario = req.user || {};
    const entregadoPor = normalizeString(usuario.name || usuario.email || 'Usuario autenticado');

    const datosLimpiados = {
      material: normalizeString(material),
      modelo: normalizeString(modelo),
      cantidad: Number(cantidad),
      receptor: normalizeString(receptor),
      departamento: normalizeString(departamento),
      entregadoPor,
    };

    const nuevaEntrega = new Entrega(datosLimpiados);
    const entregaGuardada = await nuevaEntrega.save();

    await auditLogger({
      action: 'CREATE',
      entity: 'Entrega',
      user: { name: usuario.name, email: usuario.email, oid: usuario.oid },
      details: { material: datosLimpiados.material, receptor: datosLimpiados.receptor },
      req,
    });

    return res.status(201).json({
      success: true,
      data: entregaGuardada,
    });
  } catch (error) {
    next(error);
  }
};

const obtenerEntregas = async (req, res, next) => {
  try {
    const parsedPage = Number(req.query.page);
    const parsedLimit = Number(req.query.limit);
    const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 20;
    const skip = (page - 1) * limit;

    const [entregas, total] = await Promise.all([
      Entrega.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Entrega.countDocuments(),
    ]);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    await auditLogger({
      action: 'READ',
      entity: 'Entrega',
      user: { name: req.user?.name, email: req.user?.email, oid: req.user?.oid },
      details: { count: entregas.length, page, limit, total },
      req,
    });

    return res.status(200).json({
      success: true,
      data: entregas,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

const obtenerEstadisticas = async (req, res, next) => {
  try {
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const [estadisticas] = await Entrega.aggregate([
      {
        $facet: {
          entregasHoy: [
            { $match: { fechaEntrega: { $gte: inicioHoy } } },
            { $count: 'total' },
          ],
          entregasMes: [
            { $match: { fechaEntrega: { $gte: inicioMes } } },
            { $count: 'total' },
          ],
          departamentos: [
            { $match: { departamento: { $nin: ['', null] } } },
            { $group: { _id: '$departamento' } },
            { $count: 'total' },
          ],
          usuarios: [
            { $match: { entregadoPor: { $nin: ['', null] } } },
            { $group: { _id: '$entregadoPor' } },
            { $count: 'total' },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          entregasHoy: { $ifNull: [{ $first: '$entregasHoy.total' }, 0] },
          entregasMes: { $ifNull: [{ $first: '$entregasMes.total' }, 0] },
          departamentos: { $ifNull: [{ $first: '$departamentos.total' }, 0] },
          usuarios: { $ifNull: [{ $first: '$usuarios.total' }, 0] },
        },
      },
    ]);

    await auditLogger({
      action: 'READ_STATS',
      entity: 'Entrega',
      user: { name: req.user?.name, email: req.user?.email, oid: req.user?.oid },
      details: estadisticas,
      req,
    });

    return res.status(200).json({
      success: true,
      data: estadisticas,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearEntrega,
  obtenerEntregas,
  obtenerEstadisticas,
};
