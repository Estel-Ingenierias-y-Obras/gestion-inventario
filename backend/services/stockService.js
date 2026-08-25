const MaterialOrder = require('../models/MaterialOrder');

const consumeStockFIFO = async ({ material, modelo, cantidad, session, consumedAt = new Date() }) => {
  const orders = await MaterialOrder.find({
    material,
    modelo,
    recibido: true,
    activo: true,
    cantidadDisponible: { $gt: 0 },
  })
    .collation({ locale: 'es', strength: 2 })
    .sort({ createdAt: 1, _id: 1 })
    .session(session);

  const available = orders.reduce((total, order) => total + order.cantidadDisponible, 0);
  if (available < cantidad) {
    const error = new Error('No hay stock suficiente para realizar esta entrega.');
    error.statusCode = 409;
    error.code = 'INSUFFICIENT_STOCK';
    throw error;
  }

  let remaining = cantidad;
  const movements = [];
  for (const order of orders) {
    if (remaining === 0) break;
    const consumed = Math.min(order.cantidadDisponible, remaining);
    order.cantidadDisponible -= consumed;
    remaining -= consumed;
    const depleted = order.cantidadDisponible === 0;
    if (depleted) {
      order.activo = false;
      order.agotadoAt = consumedAt;
    }
    await order.save({ session });
    movements.push({
      materialOrderId: String(order._id), numeroPedido: order.numeroPedido,
      material: order.material, modelo: order.modelo,
      previousStock: order.cantidadDisponible + consumed,
      consumed, remainingStock: order.cantidadDisponible, depleted,
    });
  }

  return movements;
};

const returnStockToOriginalOrders = async ({ allocations, material, modelo, session }) => {
  const movements = [];
  for (const allocation of allocations) {
    const order = await MaterialOrder.findById(allocation.materialOrderId).session(session);
    if (!order || order.material !== material || order.modelo !== modelo) {
      const error = new Error('No se puede localizar el pedido original del material asignado.');
      error.statusCode = 409;
      error.code = 'ORIGINAL_ORDER_NOT_AVAILABLE';
      throw error;
    }
    const returned = Number(allocation.cantidadConsumida);
    if (!Number.isInteger(returned) || returned < 1 || order.cantidadDisponible + returned > order.cantidadInicial) {
      const error = new Error('El stock del pedido original no permite procesar esta devolución.');
      error.statusCode = 409;
      error.code = 'INVALID_STOCK_RETURN';
      throw error;
    }
    const previousStock = order.cantidadDisponible;
    order.cantidadDisponible += returned;
    order.activo = true;
    order.agotadoAt = null;
    await order.save({ session });
    movements.push({
      materialOrderId: String(order._id),
      numeroPedido: order.numeroPedido,
      returned,
      previousStock,
      remainingStock: order.cantidadDisponible,
    });
  }
  return movements;
};

module.exports = { consumeStockFIFO, returnStockToOriginalOrders };
