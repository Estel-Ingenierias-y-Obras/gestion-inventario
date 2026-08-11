const AuditLog = require('../models/AuditLog');

const auditLogger = async ({ action, entity, user = null, details = {}, req }) => {
  try {
    await AuditLog.create({
      action,
      entity,
      user,
      details,
      ipAddress: req?.ip || '',
      userAgent: req?.get?.('user-agent') || '',
    });
  } catch (error) {
    console.error('[AUDIT] No se pudo guardar el registro:', error.message);
  }
};

module.exports = auditLogger;
