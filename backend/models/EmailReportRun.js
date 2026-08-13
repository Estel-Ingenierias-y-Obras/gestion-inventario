const mongoose = require('mongoose');

const emailReportRunSchema = new mongoose.Schema(
  {
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailSchedule', required: true },
    periodKey: { type: String, required: true, maxlength: 80 },
    status: { type: String, enum: ['processing', 'sent', 'failed'], required: true },
    lockedUntil: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    lastError: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true, collection: 'emailReportRuns' }
);

emailReportRunSchema.index({ schedule: 1, periodKey: 1 }, { unique: true });
emailReportRunSchema.index({ status: 1, lockedUntil: 1 });

module.exports = mongoose.model('EmailReportRun', emailReportRunSchema);
