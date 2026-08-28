const mongoose = require('mongoose');

const observationSchema = new mongoose.Schema({
  country: { type: String, default: '' },
  allowedSkuIds: { type: [String], default: [] },
  allowedSkuPartNumbers: { type: [String], default: [] },
  hasAllowedLicense: { type: Boolean, required: true },
  isSpanishCountry: { type: Boolean, required: true },
  observedAt: { type: Date, required: true },
  lastSeenAt: { type: Date, default: null },
}, { _id: false });

const entraUserMonitorSchema = new mongoose.Schema({
  entraId: { type: String, required: true, unique: true, trim: true, index: true },
  status: { type: String, enum: ['ACTIVE', 'PENDING', 'CONFIRMED'], required: true, default: 'ACTIVE', index: true },
  monitoringStartedAt: { type: Date, required: true },
  baseline: { type: observationSchema, required: true },
  lastObservation: { type: observationSchema, required: true },
  pendingReason: { type: String, default: null },
  pendingDetectedAt: { type: Date, default: null },
  confirmedAt: { type: Date, default: null },
  confirmedBy: { type: Object, default: null },
  baselineVersion: { type: Number, required: true, default: 1 },
}, { timestamps: true, collection: 'entraUserMonitors' });

module.exports = mongoose.model('EntraUserMonitor', entraUserMonitorSchema);
