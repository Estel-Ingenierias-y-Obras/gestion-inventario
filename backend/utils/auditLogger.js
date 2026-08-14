const AuditLog = require('../models/AuditLog');

const auditLogger = async ({ action, entity, user = null, details = {}, req }) => {
  try {
    await AuditLog.create({
      action,
      entity,
      user,
      details,
      ipAddress: String(req?.ip || '').slice(0, 100),
      userAgent: String(req?.get?.('user-agent') || '').slice(0, 500),
    });
  } catch (error) {
    console.error('[AUDIT] No se pudo guardar el registro.', { name: error.name });
  }
};

module.exports = auditLogger;
