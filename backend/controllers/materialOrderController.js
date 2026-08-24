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
      recibido: req.body.recibido,
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

const updateMaterialOrder = async (req, res, next) => {
  try {
    const previousOrder = await MaterialOrder.findOne({ _id: req.params.id, activo: true }).lean();
    if (!previousOrder) return res.status(404).json({ success: false, message: 'Pedido de material no encontrado.' });

    const cantidadInicial = Number(req.body.cantidadInicial);
    const consumedQuantity = previousOrder.cantidadInicial - previousOrder.cantidadDisponible;
    if (cantidadInicial < consumedQuantity) {
      return res.status(409).json({
        success: false,
        message: `La cantidad no puede ser inferior a las ${consumedQuantity} unidades ya consumidas.`,
      });
    }

    const previousValues = {
      material: previousOrder.material,
      modelo: previousOrder.modelo,
      cantidadInicial: previousOrder.cantidadInicial,
      cantidadDisponible: previousOrder.cantidadDisponible,
      numeroPedido: previousOrder.numeroPedido,
      recibido: previousOrder.recibido,
    };
    const newValues = {
      material: req.body.material,
      modelo: req.body.modelo,
      cantidadInicial,
      cantidadDisponible: cantidadInicial - consumedQuantity,
      numeroPedido: req.body.numeroPedido,
      recibido: req.body.recibido,
    };

    const order = await MaterialOrder.findOneAndUpdate(
      {
        _id: previousOrder._id,
        activo: true,
        updatedAt: previousOrder.updatedAt,
        cantidadInicial: previousOrder.cantidadInicial,
        cantidadDisponible: previousOrder.cantidadDisponible,
      },
      { $set: newValues },
      { new: true, runValidators: true }
    );
    if (!order) {
      return res.status(409).json({
        success: false,
        message: 'El pedido ha cambiado mientras se editaba. Recarga la página e inténtalo de nuevo.',
      });
    }

    await auditLogger({
      action: 'MATERIAL_ORDER_UPDATED',
      entity: 'MaterialOrder',
      user: req.user,
      details: {
        materialOrderId: String(order._id),
        valoresAnteriores: previousValues,
        valoresNuevos: newValues,
      },
      req,
    });

    if (previousOrder.recibido !== order.recibido) {
      await auditLogger({
        action: 'MATERIAL_RECEIVED_UPDATED',
        entity: 'MaterialOrder',
        user: req.user,
        details: {
          materialOrderId: String(order._id),
          numeroPedido: order.numeroPedido,
          estadoAnterior: previousOrder.recibido,
          estadoNuevo: order.recibido,
        },
        req,
      });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return next(error);
  }
};

const restoreMaterialOrder = async (req, res, next) => {
  try {
    const cantidadRestaurada = Number(req.body.cantidad);
    const depletedOrder = await MaterialOrder.findOne({
      _id: req.params.id,
      activo: false,
      cantidadDisponible: 0,
    }).lean();

    if (!depletedOrder) {
      return res.status(404).json({ success: false, message: 'Pedido agotado no encontrado.' });
    }
    if (cantidadRestaurada > depletedOrder.cantidadInicial) {
      return res.status(409).json({
        success: false,
        message: `La cantidad no puede superar las ${depletedOrder.cantidadInicial} unidades iniciales.`,
      });
    }

    const stockAnterior = depletedOrder.cantidadDisponible;
    const order = await MaterialOrder.findOneAndUpdate(
      {
        _id: depletedOrder._id,
        activo: false,
        cantidadDisponible: stockAnterior,
        updatedAt: depletedOrder.updatedAt,
      },
      {
        $set: {
          cantidadDisponible: cantidadRestaurada,
          activo: true,
          agotadoAt: null,
        },
      },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(409).json({
        success: false,
        message: 'El pedido ya ha sido restaurado o ha cambiado. Recarga la página e inténtalo de nuevo.',
      });
    }

    await auditLogger({
      action: 'MATERIAL_ORDER_RESTORED',
      entity: 'MaterialOrder',
      user: req.user,
      details: {
        materialOrderId: String(order._id),
        numeroPedido: order.numeroPedido,
        cantidadRestaurada,
        stockAnterior,
        stockNuevo: order.cantidadDisponible,
      },
      req,
    });

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return next(error);
  }
};

const deleteMaterialOrder = async (req, res, next) => {
  try {
    const order = await MaterialOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Pedido de material no encontrado.' });

    const deletedOrder = {
      id: String(order._id), numeroPedido: order.numeroPedido,
      producto: order.material, modelo: order.modelo, cantidadRestante: order.cantidadDisponible,
    };
    await order.deleteOne();
    await auditLogger({
      action: 'MATERIAL_ORDER_DELETED',
      entity: 'MaterialOrder',
      user: req.user,
      details: { pedidoEliminado: deletedOrder },
      req,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listMaterialOrders, listDepletedMaterialOrders, listStockCatalog,
  createMaterialOrder, updateMaterialOrder, restoreMaterialOrder, deleteMaterialOrder,
};
