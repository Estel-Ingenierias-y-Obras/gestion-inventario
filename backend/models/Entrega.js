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
    cantidad: {
      type: Number,
      required: [true, 'La cantidad es obligatoria'],
      min: [1, 'La cantidad debe ser mayor que cero'],
    },
    receptor: {
      type: String,
      required: [true, 'El receptor es obligatorio'],
      trim: true,
      maxlength: [100, 'El receptor no puede superar 100 caracteres'],
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
  },
  {
    timestamps: true,
  }
);

entregaSchema.index({ createdAt: -1 });
entregaSchema.index({ departamento: 1, fechaEntrega: -1 });
entregaSchema.index({ material: 1, modelo: 1 });

module.exports = mongoose.model('Entrega', entregaSchema);
