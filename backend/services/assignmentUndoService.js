const MaterialOrder = require('../models/MaterialOrder');

const invalidTrace = (message, code) => {
  const error = new Error(message);
  error.statusCode = 409;
  error.code = code;
  return error;
};

const undoWarehouseAssignment = async ({ assignment, session }) => {
  const allocations = assignment.stockAllocations || [];
  const allocatedQuantity = allocations.reduce((total, item) => total + item.cantidadConsumida, 0);
  if (allocations.length === 0 || allocatedQuantity !== assignment.cantidad) {
    throw invalidTrace('La asignación no conserva una trazabilidad de stock válida.', 'INVALID_ASSIGNMENT_TRACE');
  }
  const movements = [];
  for (const allocation of allocations) {
    const order = await MaterialOrder.findById(allocation.materialOrderId).session(session);
    if (!order || order.material !== assignment.material || order.modelo !== assignment.modelo) {
      throw invalidTrace('No se puede localizar el pedido original de la asignación.', 'ORIGINAL_ORDER_NOT_AVAILABLE');
    }
    const returned = Number(allocation.cantidadConsumida);
    if (!Number.isInteger(returned) || returned < 1 || order.cantidadDisponible + returned > order.cantidadInicial) {
      throw invalidTrace('El pedido original no permite deshacer esta asignación.', 'INVALID_STOCK_UNDO');
    }
    const previousStock = order.cantidadDisponible;
    order.cantidadDisponible += returned;
    order.activo = true;
    order.agotadoAt = null;
    await order.save({ session });
    movements.push({ materialOrderId: String(order._id), numeroPedido: order.numeroPedido,
      returned, previousStock, remainingStock: order.cantidadDisponible });
  }
  return movements;
};

const undoManualAssignment = async ({ assignment, createdBy, session }) => {
  const [order] = await MaterialOrder.create([{
    material: assignment.material, modelo: assignment.modelo,
    numeroPedido: null, numeroSerie: assignment.numeroSerie || null,
    cantidadInicial: assignment.cantidad, cantidadDisponible: assignment.cantidad,
    recibido: true, activo: true, createdBy,
  }], { session });
  return [{ materialOrderId: String(order._id), numeroPedido: null, returned: assignment.cantidad,
    previousStock: 0, remainingStock: assignment.cantidad }];
};

const undoAssignment = async ({ assignment, createdBy, session }) => {
  const stockMovements = assignment.origen === 'almacen'
    ? await undoWarehouseAssignment({ assignment, session })
    : await undoManualAssignment({ assignment, createdBy, session });
  assignment.undone = true;
  assignment.undoneAt = new Date();
  assignment.undoneBy = { email: createdBy };
  assignment.undoReason = 'Asignación registrada por error';
  assignment.removed = true;
  assignment.removedAt = assignment.undoneAt;
  assignment.removedBy = assignment.undoneBy;
  await assignment.save({ session });
  return stockMovements;
};

module.exports = { undoAssignment };
