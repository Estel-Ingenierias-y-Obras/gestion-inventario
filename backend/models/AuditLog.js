const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    entity: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    user: {
      type: Object,
      default: null,
    },
    details: {
      type: Object,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
      maxlength: 100,
    },
    userAgent: {
      type: String,
      default: '',
      maxlength: 500,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, action: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ 'user.email': 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
