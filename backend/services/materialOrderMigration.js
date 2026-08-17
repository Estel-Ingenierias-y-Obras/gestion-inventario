const MaterialOrder = require('../models/MaterialOrder');

const migrateLegacyMaterialOrders = async () => {
  await MaterialOrder.updateMany(
    { $or: [{ material: { $exists: false } }, { material: '' }] },
    [{ $set: { material: { $ifNull: ['$producto', 'Material sin especificar'] } } }],
    { updatePipeline: true }
  );
  await MaterialOrder.updateMany(
    { $or: [{ modelo: { $exists: false } }, { modelo: '' }] },
    { $set: { modelo: 'Sin especificar' } }
  );
  await MaterialOrder.updateMany(
    { $or: [{ numeroPedido: { $exists: false } }, { numeroPedido: '' }] },
    [{ $set: { numeroPedido: { $ifNull: ['$numeroCompra', 'Pedido anterior'] } } }],
    { updatePipeline: true }
  );
};

module.exports = migrateLegacyMaterialOrders;
