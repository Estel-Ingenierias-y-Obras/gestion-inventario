const mongoose = require('mongoose');

const deliveryNotificationRecipientSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    createdBy: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  },
  { timestamps: true, collection: 'deliveryNotificationRecipients' }
);

deliveryNotificationRecipientSchema.index({ email: 1 }, { unique: true });
deliveryNotificationRecipientSchema.index({ createdAt: 1 });

module.exports = mongoose.model('DeliveryNotificationRecipient', deliveryNotificationRecipientSchema);
