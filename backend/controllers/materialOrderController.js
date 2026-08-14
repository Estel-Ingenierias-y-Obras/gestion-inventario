const MaterialOrder = require('../models/MaterialOrder');
const auditLogger = require('../utils/auditLogger');

const listMaterialOrders = async (req, res, next) => {
  try {
    const orders = await MaterialOrder.find({ activo: true }).sort({ createdAt: 1 }).lean();
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    return next(error);
  }
};

const listDepletedMaterialOrders = async (req, res, next) => {
  try {
    const orders = await MaterialOrder.find({ activo: false, cantidadDisponible: 0 })
      .sort({ agotadoAt: -1 })
      .lean();
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    return next(error);
  }
};

const listStockCatalog = async (req, res, next) => {
  try {
    const stock = await MaterialOrder.aggregate([
      { $match: { activo: true, recibido: true, cantidadDisponible: { $gt: 0 } } },
      {
        $group: {
          _id: { material: '$material', modelo: '$modelo' },
          cantidadDisponible: { $sum: '$cantidadDisponible' },
        },
      },
      {
        $project: {
          _id: 0, material: '$_id.material', modelo: '$_id.modelo', cantidadDisponible: 1,
        },
      },
      { $sort: { material: 1, modelo: 1 } },
    ]).collation({ locale: 'es', strength: 2 });
    return res.status(200).json({ success: true, data: stock });
  } catch (error) {
    return next(error);
  }
};

const createMaterialOrder = async (req, res, next) => {
  try {
    const cantidadInicial = Number(req.body.cantidadInicial);
    const order = await MaterialOrder.create({
      material: req.body.material,
      modelo: req.body.modelo,
      numeroPedido: req.body.numeroPedido,
      cantidadInicial,
      cantidadDisponible: cantidadInicial,
      recibido: true,
      activo: true,
      createdBy: req.user.email,
    });

    await auditLogger({
      action: 'MATERIAL_ORDER_CREATED',
      entity: 'MaterialOrder',
      user: req.user,
      details: {
        materialOrderId: String(order._id), numeroPedido: order.numeroPedido,
        material: order.material, modelo: order.modelo, cantidadInicial: order.cantidadInicial,
      },
      req,
    });

    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    return next(error);
  }
};

const markMaterialOrderReceived = async (req, res, next) => {
  try {
    const order = await MaterialOrder.findOneAndUpdate(
      { _id: req.params.id, activo: true },
      { $set: { recibido: true } },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Pedido de material no encontrado.' });

    await auditLogger({
      action: 'MATERIAL_RECEIVED_UPDATED',
      entity: 'MaterialOrder',
      user: req.user,
      details: {
        materialOrderId: String(order._id), numeroPedido: order.numeroPedido,
        material: order.material, modelo: order.modelo, recibido: order.recibido,
      },
      req,
    });

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listMaterialOrders, listDepletedMaterialOrders, listStockCatalog,
  createMaterialOrder, markMaterialOrderReceived,
};
