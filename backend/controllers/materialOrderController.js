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

const createMaterialOrder = async (req, res, next) => {
  try {
    const cantidadInicial = Number(req.body.cantidadInicial);
    const order = await MaterialOrder.create({
      numeroCompra: req.body.numeroCompra,
      producto: req.body.producto,
      cantidadInicial,
      cantidadDisponible: cantidadInicial,
      proveedor: req.body.proveedor || '',
      recibido: Boolean(req.body.recibido),
      activo: true,
      createdBy: req.user.email,
    });

    await auditLogger({
      action: 'MATERIAL_ORDER_CREATED',
      entity: 'MaterialOrder',
      user: req.user,
      details: {
        materialOrderId: String(order._id), numeroCompra: order.numeroCompra,
        producto: order.producto, cantidadInicial: order.cantidadInicial, recibido: order.recibido,
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
        materialOrderId: String(order._id), numeroCompra: order.numeroCompra,
        producto: order.producto, recibido: order.recibido,
      },
      req,
    });

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listMaterialOrders, listDepletedMaterialOrders, createMaterialOrder, markMaterialOrderReceived,
};
