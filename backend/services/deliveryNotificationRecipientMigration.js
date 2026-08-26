const DeliveryNotificationRecipient = require('../models/DeliveryNotificationRecipient');
const SystemMigration = require('../models/SystemMigration');

// Destinatario usado por las notificaciones antes de almacenarse la configuración en MongoDB.
const LEGACY_DELIVERY_RECIPIENT = 'javier.costa@esteling.com';
const MIGRATION_KEY = 'delivery-notification-recipient-to-mongodb-v1';

const migrateDeliveryNotificationRecipient = async () => {
  if (await SystemMigration.exists({ key: MIGRATION_KEY })) return;
  await DeliveryNotificationRecipient.updateOne(
    { email: LEGACY_DELIVERY_RECIPIENT },
    { $setOnInsert: { email: LEGACY_DELIVERY_RECIPIENT, createdBy: 'system-migration' } },
    { upsert: true }
  );
  await SystemMigration.updateOne({ key: MIGRATION_KEY }, { $setOnInsert: { key: MIGRATION_KEY } }, { upsert: true });
};

module.exports = migrateDeliveryNotificationRecipient;
