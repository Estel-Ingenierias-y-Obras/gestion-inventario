const mongoose = require('mongoose');

const personMaterialAssignmentSchema = new mongoose.Schema(
  {
    personId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true, index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    departmentName: { type: String, required: true, trim: true, maxlength: 100 },
    personName: { type: String, required: true, trim: true, maxlength: 150 },
    entregaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entrega', default: null, index: true },
    material: { type: String, required: true, trim: true, maxlength: 100 },
    modelo: { type: String, required: true, trim: true, maxlength: 100 },
    cantidad: { type: Number, required: true, min: 1, validate: Number.isInteger },
    origen: { type: String, required: true, enum: ['almacen', 'manual'] },
    numeroSerie: { type: String, default: null, trim: true, maxlength: 150 },
    numeroPedido: { type: String, default: null, trim: true, maxlength: 500 },
    stockAllocations: {
      type: [{
        materialOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialOrder', required: true },
        numeroPedido: { type: String, default: null, trim: true, maxlength: 100 },
        cantidadConsumida: { type: Number, required: true, min: 1 },
      }],
      default: undefined,
    },
    operationId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    transferSources: {
      type: [{
        assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PersonMaterialAssignment', required: true },
        previousPersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
        previousPersonName: { type: String, required: true, trim: true, maxlength: 150 },
        numeroSerie: { type: String, default: null, trim: true, maxlength: 150 },
        numeroPedido: { type: String, default: null, trim: true, maxlength: 100 },
        cantidad: { type: Number, required: true, min: 1 },
      }],
      default: undefined,
    },
    assignedAt: { type: Date, default: Date.now, required: true },
    assignedBy: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    removed: { type: Boolean, default: false, index: true },
    removedAt: { type: Date, default: null },
    removedBy: { type: Object, default: null },
  },
  { timestamps: true, collection: 'personMaterialAssignments' }
);

personMaterialAssignmentSchema.index({ personId: 1, assignedAt: -1 });

module.exports = mongoose.model('PersonMaterialAssignment', personMaterialAssignmentSchema);
