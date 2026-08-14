const mongoose = require('mongoose');

const emailScheduleSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    frequency: { type: String, required: true, enum: ['weekly', 'monthly'] },
    dayOfWeek: { type: Number, min: 1, max: 7, default: null },
    dayOfMonth: { type: Number, min: 1, max: 31, default: null },
    hour: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    active: { type: Boolean, default: true },
    createdBy: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    effectiveFrom: { type: Date, default: Date.now },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'emailSchedules' }
);

emailScheduleSchema.index({ active: 1, frequency: 1 });
emailScheduleSchema.index({ createdAt: -1 });
emailScheduleSchema.index({ email: 1, frequency: 1, dayOfWeek: 1, dayOfMonth: 1, hour: 1 }, { unique: true });

module.exports = mongoose.model('EmailSchedule', emailScheduleSchema);
