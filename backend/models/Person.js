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
    source: { type: String, enum: ['legacy', 'entra'], default: 'legacy', index: true },
    entraId: { type: String, default: null, trim: true },
    entraMail: { type: String, default: null, trim: true, lowercase: true },
    entraDisplayName: { type: String, default: null, trim: true },
    entraGivenName: { type: String, default: null, trim: true },
    entraSurname: { type: String, default: null, trim: true },
    entraDepartment: { type: String, default: null, trim: true },
    entraAssignedLicenses: { type: [String], default: [] },
    entraVisible: { type: Boolean, default: false, index: true },
    entraLastSeenAt: { type: Date, default: null },
    entraDeactivationStatus: {
      type: String, enum: ['ACTIVE', 'UNMONITORED', 'PENDING', 'CONFIRMED'], default: 'UNMONITORED', index: true,
    },
    entraDeactivationReason: { type: String, default: null, trim: true },
    entraDeactivationDetectedAt: { type: Date, default: null },
    entraDeactivationConfirmedAt: { type: Date, default: null },
    entraDeactivationConfirmedBy: { type: Object, default: null },
    createdBy: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    deleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Object, default: null },
  },
  { timestamps: true, collection: 'people' }
);

personSchema.index({ departmentId: 1, deleted: 1, nombreCompleto: 1 });
personSchema.index({ entraId: 1 }, { unique: true, partialFilterExpression: { entraId: { $type: 'string' } } });
personSchema.index({ source: 1, entraVisible: 1, departmentId: 1, nombreCompleto: 1 });
personSchema.index({ source: 1, entraDeactivationStatus: 1, nombreCompleto: 1 });

module.exports = mongoose.model('Person', personSchema);
