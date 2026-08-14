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

module.exports = { consumeStockFIFO };
