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
    let transferRemaining = consumed;
    const transferSources = [];
    for (const credit of order.transferCredits || []) {
      if (transferRemaining === 0) break;
      const transferred = Math.min(credit.cantidadDisponible, transferRemaining);
      if (transferred < 1) continue;
      credit.cantidadDisponible -= transferred;
      transferRemaining -= transferred;
      transferSources.push({
        assignmentId: credit.assignmentId,
        previousPersonId: credit.previousPersonId,
        previousPersonName: credit.previousPersonName,
        numeroSerie: credit.numeroSerie || null,
        numeroPedido: order.numeroPedido || null,
        cantidad: transferred,
      });
    }
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
      previousStock: order.cantidadDisponible + consumed, transferSources,
      consumed, remainingStock: order.cantidadDisponible, depleted,
    });
  }

  return movements;
};

const returnStockToOriginalOrders = async ({ allocations, material, modelo, assignment, session }) => {
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
    order.transferCredits = order.transferCredits || [];
    order.transferCredits.push({
      assignmentId: assignment._id,
      previousPersonId: assignment.personId,
      previousPersonName: assignment.personName,
      numeroSerie: assignment.numeroSerie || null,
      cantidadDisponible: returned,
      returnedAt: assignment.removedAt || new Date(),
    });
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

const returnManualAssignmentToStock = async ({ assignment, createdBy, session }) => {
  const [order] = await MaterialOrder.create([{
    material: assignment.material,
    modelo: assignment.modelo,
    numeroPedido: null,
    numeroSerie: assignment.numeroSerie || null,
    sourceAssignmentId: assignment._id,
    transferCredits: [{
      assignmentId: assignment._id,
      previousPersonId: assignment.personId,
      previousPersonName: assignment.personName,
      numeroSerie: assignment.numeroSerie || null,
      cantidadDisponible: assignment.cantidad,
      returnedAt: assignment.removedAt || new Date(),
    }],
    cantidadInicial: assignment.cantidad,
    cantidadDisponible: assignment.cantidad,
    recibido: true,
    activo: true,
    createdBy,
  }], { session });

  return [{
    materialOrderId: String(order._id),
    numeroPedido: null,
    numeroSerie: order.numeroSerie,
    returned: order.cantidadDisponible,
    previousStock: 0,
    remainingStock: order.cantidadDisponible,
  }];
};

const returnAssignmentToStock = async ({ assignment, user, session }) => {
  assignment.removedAt = new Date();
  let stockMovements;
  if (assignment.origen === 'almacen') {
    const allocations = assignment.stockAllocations || [];
    const allocatedQuantity = allocations.reduce((total, item) => total + item.cantidadConsumida, 0);
    if (allocations.length === 0 || allocatedQuantity !== assignment.cantidad) {
      const error = new Error('La asignación no conserva una trazabilidad de stock válida.');
      error.statusCode = 409;
      error.code = 'INVALID_ASSIGNMENT_TRACE';
      throw error;
    }
    stockMovements = await returnStockToOriginalOrders({
      allocations, material: assignment.material, modelo: assignment.modelo, assignment, session,
    });
  } else {
    stockMovements = await returnManualAssignmentToStock({
      assignment, createdBy: user?.email || assignment.assignedBy, session,
    });
  }
  assignment.removed = true;
  assignment.removedBy = user;
  await assignment.save({ session });
  return stockMovements;
};

module.exports = {
  consumeStockFIFO, returnStockToOriginalOrders, returnManualAssignmentToStock, returnAssignmentToStock,
};
