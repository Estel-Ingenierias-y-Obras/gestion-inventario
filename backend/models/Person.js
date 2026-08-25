const mongoose = require('mongoose');

const personSchema = new mongoose.Schema(
  {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    nombreCompleto: { type: String, required: true, trim: true, minlength: 2, maxlength: 150 },
    createdBy: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    deleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Object, default: null },
  },
  { timestamps: true, collection: 'people' }
);

personSchema.index({ departmentId: 1, deleted: 1, nombreCompleto: 1 });

module.exports = mongoose.model('Person', personSchema);
