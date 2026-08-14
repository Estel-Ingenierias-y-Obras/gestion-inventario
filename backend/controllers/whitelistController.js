const WhitelistUser = require('../models/WhitelistUser');
const auditLogger = require('../utils/auditLogger');
const { getAdminEmail, normalizeEmail } = require('../middleware/whitelist');

const getAccessStatus = (req, res) => res.status(200).json({
  success: true,
  data: {
    authorized: true,
    isAdmin: Boolean(req.access?.isAdmin),
    email: req.access?.email || '',
  },
});

const listWhitelistUsers = async (req, res, next) => {
  try {
    const users = await WhitelistUser.find().sort({ createdAt: 1 }).lean();
    const adminEmail = getAdminEmail();

    return res.status(200).json({
      success: true,
      data: users.map((user) => ({
        ...user,
        isPrimaryAdmin: user.email === adminEmail,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

const addWhitelistUser = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const existing = await WhitelistUser.exists({ email });

    if (existing || email === getAdminEmail()) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_EMAIL',
        message: 'Este correo electrónico ya está autorizado.',
      });
    }

    const user = await WhitelistUser.create({ name, email });

    await auditLogger({
      action: 'USER_WHITELIST_ADD',
      entity: 'WhitelistUser',
      user: req.user,
      details: { affectedName: user.name, affectedEmail: user.email },
      req,
    });

    return res.status(201).json({ success: true, data: user });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_EMAIL',
        message: 'Este correo electrónico ya está autorizado.',
      });
    }
    return next(error);
  }
};

const deleteWhitelistUser = async (req, res, next) => {
  try {
    const user = await WhitelistUser.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    if (user.email === getAdminEmail()) {
      return res.status(403).json({
        success: false,
        code: 'PRIMARY_ADMIN_PROTECTED',
        message: 'No se puede eliminar el administrador principal',
      });
    }

    await user.deleteOne();
    await auditLogger({
      action: 'USER_WHITELIST_DELETE',
      entity: 'WhitelistUser',
      user: req.user,
      details: { affectedName: user.name, affectedEmail: user.email },
      req,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getAccessStatus, listWhitelistUsers, addWhitelistUser, deleteWhitelistUser };
