const mongoose = require('mongoose');

const entraSyncRunSchema = new mongoose.Schema(
  {
    mode: { type: String, required: true, enum: ['SIMULATION'], default: 'SIMULATION' },
    status: {
      type: String,
      required: true,
      enum: ['RUNNING', 'COMPLETED', 'FAILED', 'CONFIGURATION_PENDING'],
      default: 'RUNNING',
      index: true,
    },
    activeLock: { type: String, default: undefined },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date, default: null },
    trigger: { type: String, required: true, enum: ['MANUAL', 'AUTOMATION'] },
    triggeredBy: { type: Object, default: null },
    configuredSkuPartNumbers: { type: [String], default: [] },
    resolvedAllowedSkus: { type: [Object], default: [] },
    detectedSkus: { type: [Object], default: [] },
    licenseConfigurationPending: { type: Boolean, default: false },
    counters: { type: Object, default: {} },
    error: { type: Object, default: null },
  },
  { timestamps: true, collection: 'entraSyncRuns' }
);

entraSyncRunSchema.index({ startedAt: -1 });
entraSyncRunSchema.index({ activeLock: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('EntraSyncRun', entraSyncRunSchema);
