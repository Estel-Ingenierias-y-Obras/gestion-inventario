const rateLimit = require('express-rate-limit');

const createLimiter = ({ windowMs, max, message }) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, message }),
});

const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.',
});

const automationLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'Se ha superado el límite temporal de automatización.',
});

const graphTestLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Se ha superado el límite de pruebas de Microsoft Graph.',
});

module.exports = { apiLimiter, automationLimiter, graphTestLimiter };
