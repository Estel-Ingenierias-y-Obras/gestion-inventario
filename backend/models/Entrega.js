const mongoose = require('mongoose');

const entregaSchema = new mongoose.Schema(
  {
    material: {
      type: String,
      required: [true, 'El material es obligatorio'],
      trim: true,
      minlength: [2, 'El material debe tener al menos 2 caracteres'],
      maxlength: [100, 'El material no puede superar 100 caracteres'],
    },
    modelo: {
      type: String,
      required: [true, 'El modelo es obligatorio'],
      trim: true,
      maxlength: [100, 'El modelo no puede superar 100 caracteres'],
    },
    numeroSerie: {
      type: String,
      default: null,
      trim: true,
      maxlength: [150, 'El número de serie no puede superar 150 caracteres'],
    },
    cantidad: {
      type: Number,
      required: [true, 'La cantidad es obligatoria'],
      min: [1, 'La cantidad debe ser mayor que cero'],
    },
    stockAllocations: {
      type: [{
        materialOrderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'MaterialOrder',
          required: true,
        },
        numeroPedido: {
          type: String,
          default: null,
          trim: true,
          maxlength: 100,
        },
        cantidadConsumida: {
          type: Number,
          required: true,
          min: 1,
          validate: {
            validator: Number.isInteger,
            message: 'La cantidad consumida debe ser un número entero.',
          },
        },
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
    receptor: {
      type: String,
      required: [true, 'El receptor es obligatorio'],
      trim: true,
      maxlength: [100, 'El receptor no puede superar 100 caracteres'],
    },
    personId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person',
      default: null,
      index: true,
    },
    departamento: {
      type: String,
      required: [true, 'El departamento es obligatorio'],
      trim: true,
      maxlength: [100, 'El departamento no puede superar 100 caracteres'],
    },
    entregadoPor: {
      type: String,
      required: [true, 'El campo entregado por es obligatorio'],
      trim: true,
      maxlength: [255, 'El campo entregado por no puede superar 255 caracteres'],
    },
    fechaEntrega: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: String,
      default: '',
      trim: true,
      maxlength: 255,
    },
    role: {
      type: String,
      default: 'consulta',
      enum: ['admin', 'inventario', 'consulta'],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

entregaSchema.index({ createdAt: -1 });
entregaSchema.index({ departamento: 1, fechaEntrega: -1 });
entregaSchema.index({ material: 1, modelo: 1 });
entregaSchema.index({ deleted: 1, fechaEntrega: -1 });

module.exports = mongoose.model('Entrega', entregaSchema);
