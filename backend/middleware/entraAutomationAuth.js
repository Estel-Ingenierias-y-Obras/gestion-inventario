const crypto = require('crypto');
const authenticate = require('./auth');
const { requireWhitelist, requireAdmin } = require('./whitelist');

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const authenticateEntraAutomationOrAdmin = (req, res, next) => {
  const suppliedKey = req.get('x-entra-simulation-key') || '';
  if (suppliedKey) {
    const configuredKey = process.env.ENTRA_SIMULATION_API_KEY || '';
    if (configuredKey.length < 32) return res.status(503).json({ success: false, message: 'La automatización Entra no está configurada.' });
    if (!safeEqual(suppliedKey, configuredKey)) return res.status(401).json({ success: false, message: 'Credenciales de automatización no válidas.' });
    req.automation = true;
    req.user = { name: 'Entra simulation', email: 'entra-simulation@system', tenantId: '', oid: '' };
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

module.exports = authenticateEntraAutomationOrAdmin;
