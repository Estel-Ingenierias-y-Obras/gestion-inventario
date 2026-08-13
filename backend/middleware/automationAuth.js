const crypto = require('crypto');
const authenticate = require('./auth');
const { requireWhitelist, requireAdmin } = require('./whitelist');

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const authenticateAutomationOrAdmin = (req, res, next) => {
  const configuredKey = process.env.POWER_AUTOMATE_API_KEY || '';
  const suppliedKey = req.get('x-automation-key') || '';

  if (suppliedKey) {
    if (configuredKey.length < 32) {
      return res.status(503).json({ success: false, message: 'La automatización no está configurada.' });
    }
    if (!safeEqual(suppliedKey, configuredKey)) {
      return res.status(401).json({ success: false, message: 'Credenciales de automatización no válidas.' });
    }

    req.automation = true;
    req.user = {
      name: 'Power Automate',
      email: 'power-automate',
      tenantId: '',
      oid: '',
    };
    req.access = { isAdmin: true, email: 'power-automate' };
    return next();
  }

  return authenticate(req, res, (authError) => {
    if (authError) return next(authError);
    return requireWhitelist(req, res, (whitelistError) => {
      if (whitelistError) return next(whitelistError);
      return requireAdmin(req, res, next);
    });
  });
};

module.exports = authenticateAutomationOrAdmin;
