const WhitelistUser = require('../models/WhitelistUser');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const getAdminEmail = () => normalizeEmail(process.env.ADMIN_EMAIL);

const requireWhitelist = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.user?.email);
    const adminEmail = getAdminEmail();

    if (!email) {
      return res.status(403).json({
        success: false,
        code: 'NOT_WHITELISTED',
        message: 'El token no contiene un correo electrónico válido.',
      });
    }

    if (email === adminEmail) {
      req.access = { isAdmin: true, email };
      return next();
    }

    const authorizedUser = await WhitelistUser.exists({ email });
    if (!authorizedUser) {
      return res.status(403).json({
        success: false,
        code: 'NOT_WHITELISTED',
        message: 'El usuario no está autorizado para acceder a esta aplicación.',
      });
    }

    req.access = { isAdmin: true, email };
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.access?.isAdmin) {
    return res.status(403).json({
      success: false,
      code: 'ADMIN_REQUIRED',
      message: 'Solo el administrador principal puede gestionar la whitelist.',
    });
  }

  return next();
};

module.exports = { getAdminEmail, normalizeEmail, requireWhitelist, requireAdmin };
