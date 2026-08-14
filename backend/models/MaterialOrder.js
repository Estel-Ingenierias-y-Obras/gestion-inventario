const mongoose = require('mongoose');

const materialOrderSchema = new mongoose.Schema(
  {
    material: { type: String, required: true, trim: true, maxlength: 100 },
    modelo: { type: String, required: true, trim: true, maxlength: 100 },
    numeroPedido: { type: String, required: true, trim: true, maxlength: 100 },
    cantidadInicial: { type: Number, required: true, min: 1 },
    cantidadDisponible: { type: Number, required: true, min: 0 },
    // Campos legacy conservados para no eliminar información de pedidos existentes.
    numeroCompra: { type: String, trim: true, maxlength: 100, default: undefined },
    producto: { type: String, trim: true, maxlength: 100, default: undefined },
    proveedor: { type: String, trim: true, maxlength: 150, default: '' },
    recibido: { type: Boolean, default: false },
    activo: { type: Boolean, default: true },
    agotadoAt: { type: Date, default: null },
    createdBy: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  },
  { timestamps: true, collection: 'materialOrders' }
);

materialOrderSchema.index(
  { material: 1, modelo: 1, recibido: 1, activo: 1, createdAt: 1 },
  { collation: { locale: 'es', strength: 2 } }
);
materialOrderSchema.index({ activo: 1, createdAt: -1 });
materialOrderSchema.index({ numeroPedido: 1 });

module.exports = mongoose.model('MaterialOrder', materialOrderSchema);
