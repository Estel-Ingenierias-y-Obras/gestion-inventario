const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    source: { type: String, enum: ['legacy', 'entra', 'virtual'], default: 'legacy', index: true },
    entraKey: { type: String, default: null, trim: true },
    entraVisible: { type: Boolean, default: false, index: true },
    entraLastSeenAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'departments' }
);

departmentSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: 'es', strength: 2 } }
);
departmentSchema.index({ entraKey: 1 }, { unique: true, partialFilterExpression: { entraKey: { $type: 'string' } } });
departmentSchema.index({ source: 1, entraVisible: 1, name: 1 });

module.exports = mongoose.model('Department', departmentSchema);
