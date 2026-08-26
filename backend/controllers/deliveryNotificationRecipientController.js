const DeliveryNotificationRecipient = require('../models/DeliveryNotificationRecipient');
const auditLogger = require('../utils/auditLogger');

const listRecipients = async (_req, res, next) => {
  try {
    const recipients = await DeliveryNotificationRecipient.find().sort({ email: 1 }).lean();
    return res.json({ success: true, data: recipients });
  } catch (error) { return next(error); }
};

const createRecipient = async (req, res, next) => {
  try {
    const recipient = await DeliveryNotificationRecipient.create({
      email: req.body.email,
      createdBy: req.user.email,
    });
    await auditLogger({
      action: 'DELIVERY_NOTIFICATION_EMAIL_CREATED', entity: 'DeliveryNotificationRecipient',
      user: req.user, details: { recipientId: String(recipient._id), email: recipient.email, fecha: recipient.createdAt }, req,
    });
    return res.status(201).json({ success: true, data: recipient });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, code: 'DUPLICATE_RECIPIENT', message: 'Este destinatario ya está configurado.' });
    return next(error);
  }
};

const deleteRecipient = async (req, res, next) => {
  try {
    const recipient = await DeliveryNotificationRecipient.findById(req.params.id);
    if (!recipient) return res.status(404).json({ success: false, message: 'Destinatario no encontrado.' });
    await recipient.deleteOne();
    const removedAt = new Date();
    await auditLogger({
      action: 'DELIVERY_NOTIFICATION_EMAIL_REMOVED', entity: 'DeliveryNotificationRecipient',
      user: req.user, details: { recipientId: String(recipient._id), email: recipient.email, fecha: removedAt }, req,
    });
    return res.json({ success: true });
  } catch (error) { return next(error); }
};

module.exports = { listRecipients, createRecipient, deleteRecipient };
