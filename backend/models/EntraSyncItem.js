const mongoose = require('mongoose');

const entraSyncItemSchema = new mongoose.Schema(
  {
    runId: { type: mongoose.Schema.Types.ObjectId, ref: 'EntraSyncRun', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'ELIGIBLE_USER', 'EXCLUDED_USER', 'DEPARTMENT', 'DEPARTMENT_REMOVAL_PREVIEW',
        'PERSON_MATCH', 'POTENTIAL_CREATE', 'POTENTIAL_DEACTIVATION',
        'MATERIAL_RETURN_PREVIEW', 'TRACEABILITY_PROBLEM',
      ],
      index: true,
    },
    entraId: { type: String, default: null, index: true },
    personId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', default: null, index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    displayName: { type: String, default: '' },
    mail: { type: String, default: '' },
    department: { type: String, default: '' },
    licenseSkuIds: { type: [String], default: [] },
    matchedAllowedSkus: { type: [Object], default: [] },
    classification: { type: String, default: '' },
    reason: { type: String, default: '' },
    dataIssues: { type: [String], default: [] },
    matching: { type: Object, default: null },
    materialPreview: { type: [Object], default: [] },
    traceabilityProblems: { type: [Object], default: [] },
    details: { type: Object, default: {} },
  },
  { timestamps: true, collection: 'entraSyncItems' }
);

entraSyncItemSchema.index({ runId: 1, type: 1 });
entraSyncItemSchema.index({ runId: 1, entraId: 1 });
entraSyncItemSchema.index({ runId: 1, personId: 1 });

module.exports = mongoose.model('EntraSyncItem', entraSyncItemSchema);
