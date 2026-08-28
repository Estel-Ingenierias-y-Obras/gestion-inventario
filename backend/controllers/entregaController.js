const mongoose = require('mongoose');
const Entrega = require('../models/Entrega');
const Department = require('../models/Department');
const Person = require('../models/Person');
const PersonMaterialAssignment = require('../models/PersonMaterialAssignment');
const auditLogger = require('../utils/auditLogger');
const { consumeStockFIFO } = require('../services/stockService');
const { sendDeliveryNotification } = require('../services/deliveryNotificationService');

const normalizeString = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const entregaSortFields = new Set([
  'fechaEntrega', 'material', 'modelo', 'cantidad', 'receptor', 'departamento', 'entregadoPor',
]);

const buildEntregaFilter = ({ period, search }) => {
  const filter = { deleted: { $ne: true } };
  const ahora = new Date();

  if (period === 'week') {
    const inicioSemana = new Date(ahora);
    const dia = inicioSemana.getDay();
    inicioSemana.setDate(inicioSemana.getDate() - (dia === 0 ? 6 : dia - 1));
    inicioSemana.setHours(0, 0, 0, 0);
    filter.fechaEntrega = { $gte: inicioSemana };
  } else if (period === 'month') {
    filter.fechaEntrega = { $gte: new Date(ahora.getFullYear(), ahora.getMonth(), 1) };
  }

  const normalizedSearch = normalizeString(search).slice(0, 100);
  if (normalizedSearch) {
    const partialMatch = new RegExp(escapeRegExp(normalizedSearch), 'i');
    filter.$or = [
      { material: partialMatch },
      { modelo: partialMatch },
      { receptor: partialMatch },
      { departamento: partialMatch },
      { entregadoPor: partialMatch },
    ];
  }

  return filter;
};

const crearEntrega = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { personId, departmentId } = req.body;
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    const usuario = req.user || {};
    const entregadoPor = normalizeString(usuario.name || usuario.email || 'Usuario autenticado');

    const person = await Person.findOne({
      _id: personId,
      departmentId,
      deleted: { $ne: true },
      source: 'entra',
      entraVisible: true,
      entraDeactivationStatus: { $ne: 'PENDING' },
    }).lean();
    if (!person) {
      return res.status(400).json({
        success: false,
        code: 'PERSON_NOT_AVAILABLE',
        message: 'La persona seleccionada no existe o no pertenece al departamento indicado.',
      });
    }
    const department = await Department.findOne({
      _id: person.departmentId, source: { $in: ['entra', 'virtual'] }, entraVisible: true,
    }).lean();
    if (!department) {
      return res.status(400).json({ success: false, code: 'DEPARTMENT_NOT_AVAILABLE', message: 'El departamento de la persona ya no está disponible.' });
    }
    const operationId = new mongoose.Types.ObjectId();
    const entregasGuardadas = [];
    const assignments = [];
    const allStockMovements = [];
    await session.withTransaction(async () => {
      for (const item of requestedItems) {
        const data = {
          material: normalizeString(item.material), modelo: normalizeString(item.modelo),
          numeroSerie: normalizeString(item.numeroSerie) || null, cantidad: Number(item.cantidad),
        };
        const stockMovements = await consumeStockFIFO({ ...data, session });
        const stockAllocations = stockMovements.map((movement) => ({
          materialOrderId: movement.materialOrderId,
          numeroPedido: movement.numeroPedido,
          cantidadConsumida: movement.consumed,
        }));
        const transferSources = stockMovements.flatMap((movement) => movement.transferSources || []);
        const [delivery] = await Entrega.create([{
          ...data, personId, departmentId, operationId, transferSources,
          receptor: person.nombreCompleto, departamento: department.name,
          entregadoPor, createdBy: usuario.email || '', stockAllocations,
        }], { session });
        const [assignment] = await PersonMaterialAssignment.create([{
          personId: person._id, departmentId: department._id, operationId,
          departmentName: department.name, personName: person.nombreCompleto,
          entregaId: delivery._id, material: data.material, modelo: data.modelo,
          cantidad: data.cantidad, origen: 'almacen', numeroSerie: data.numeroSerie,
          numeroPedido: [...new Set(stockAllocations.map((allocation) => allocation.numeroPedido).filter(Boolean))].join(', ') || null,
          stockAllocations, transferSources, assignedAt: delivery.fechaEntrega, assignedBy: usuario.email || '',
        }], { session });
        entregasGuardadas.push(delivery);
        assignments.push(assignment);
        allStockMovements.push({ delivery, assignment, movements: stockMovements });
      }
    });

    for (const entry of allStockMovements) {
      const { delivery, assignment, movements } = entry;
      const common = { operationId: String(operationId), entregaId: String(delivery._id), material: delivery.material, modelo: delivery.modelo };
      await auditLogger({ action: 'CREATE', entity: 'Entrega', user: req.user,
        details: { ...common, receptor: delivery.receptor }, req });
      await auditLogger({ action: 'STOCK_CONSUMED', entity: 'MaterialOrder', user: req.user,
        details: { ...common, cantidad: delivery.cantidad, movements }, req });
      await auditLogger({ action: 'MATERIAL_ASSIGNED_TO_PERSON', entity: 'PersonMaterialAssignment', user: req.user,
        details: { ...common, assignmentId: String(assignment._id), departamento: department.name,
          persona: person.nombreCompleto, personId: String(person._id), numeroSerie: delivery.numeroSerie,
          cantidad: delivery.cantidad, transferSources: delivery.transferSources }, req });
      for (const movement of movements) {
        await auditLogger({ action: 'STOCK_UPDATED', entity: 'MaterialOrder', user: req.user,
          details: { ...common, stockAnterior: movement.previousStock, stockNuevo: movement.remainingStock,
            cantidadEntregada: movement.consumed, materialOrderId: movement.materialOrderId,
            numeroPedido: movement.numeroPedido }, req });
        if (movement.depleted) await auditLogger({ action: 'MATERIAL_ORDER_DEPLETED', entity: 'MaterialOrder', user: req.user,
          details: { ...movement, ...common }, req });
      }
    }

    let notificationSent = true;
    try {
      await sendDeliveryNotification({
        operationId, receptor: person.nombreCompleto, departamento: department.name,
        fechaEntrega: entregasGuardadas[0].fechaEntrega, entregadoPor,
        deliveries: entregasGuardadas,
      });
    } catch (notificationError) {
      notificationSent = false;
      console.error('[DELIVERY NOTIFICATION] No se pudo enviar el correo.', { name: notificationError.name });
    }

    return res.status(201).json({ success: true, data: { operationId, deliveries: entregasGuardadas }, notificationSent });
  } catch (error) {
    return next(error);
  } finally {
    await session.endSession();
  }
};

const obtenerEntregas = async (req, res, next) => {
  try {
    const parsedPage = Number(req.query.page);
    const parsedLimit = Number(req.query.limit);
    const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;
    const skip = (page - 1) * limit;
    const period = ['week', 'month', 'all'].includes(req.query.period) ? req.query.period : 'all';
    const search = normalizeString(req.query.search).slice(0, 100);
    const filter = buildEntregaFilter({ period, search });
    const sortBy = entregaSortFields.has(req.query.sortBy) ? req.query.sortBy : 'fechaEntrega';
    const sortDirection = req.query.sortDirection === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortDirection, _id: 1 };

    const [entregas, total] = await Promise.all([
      Entrega.find(filter).collation({ locale: 'es', strength: 2 }).sort(sort).skip(skip).limit(limit).lean(),
      Entrega.countDocuments(filter),
    ]);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    await auditLogger({
      action: 'READ',
      entity: 'Entrega',
      user: { name: req.user?.name, email: req.user?.email, oid: req.user?.oid },
      details: { count: entregas.length, page, limit, total, period, search },
      req,
    });

    return res.status(200).json({
      success: true,
      data: entregas,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    next(error);
  }
};

const eliminarEntrega = async (req, res, next) => {
  try {
    const usuario = req.user || {};
    const deletedBy = {
      name: usuario.name || 'Usuario autenticado',
      email: usuario.email || '',
      oid: usuario.oid || '',
    };
    const entrega = await Entrega.findOneAndUpdate(
      { _id: req.params.id, deleted: { $ne: true } },
      { $set: { deleted: true, deletedAt: new Date(), deletedBy } },
      { new: true, runValidators: true }
    );

    if (!entrega) {
      return res.status(404).json({ success: false, message: 'La entrega no existe o ya ha sido eliminada.' });
    }

    await auditLogger({
      action: 'DELETE_DELIVERY',
      entity: 'Entrega',
      user: deletedBy,
      details: { entregaId: entrega._id.toString() },
      req,
    });

    return res.status(200).json({ success: true });
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
      { $match: { deleted: { $ne: true } } },
      {
        $facet: {
          entregasHoy: [{ $match: { fechaEntrega: { $gte: inicioHoy } } }, { $count: 'total' }],
          entregasMes: [{ $match: { fechaEntrega: { $gte: inicioMes } } }, { $count: 'total' }],
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

    return res.status(200).json({ success: true, data: estadisticas });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearEntrega,
  eliminarEntrega,
  obtenerEntregas,
  obtenerEstadisticas,
};
