const mongoose = require('mongoose');

const entraMonitoringStateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'USER_DEACTIVATION_MONITORING' },
  initialized: { type: Boolean, required: true, default: false },
  initializedAt: { type: Date, default: null },
  baselineVersion: { type: Number, required: true, default: 1 },
  monitoredUsers: { type: Number, required: true, default: 0 },
  lastSyncAt: { type: Date, default: null },
}, { timestamps: true, collection: 'entraMonitoringStates' });

module.exports = mongoose.model('EntraMonitoringState', entraMonitoringStateSchema);
