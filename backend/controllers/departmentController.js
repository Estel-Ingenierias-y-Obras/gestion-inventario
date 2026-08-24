const Department = require('../models/Department');
const auditLogger = require('../utils/auditLogger');

const listDepartments = async (_req, res, next) => {
  try {
    const departments = await Department.find()
      .collation({ locale: 'es', strength: 2 })
      .sort({ name: 1, _id: 1 })
      .lean();
    return res.status(200).json({ success: true, data: departments });
  } catch (error) {
    return next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const existing = await Department.findOne({ name })
      .collation({ locale: 'es', strength: 2 })
      .lean();

    if (existing) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_DEPARTMENT',
        message: 'Ya existe un departamento con este nombre.',
      });
    }

    const department = await Department.create({ name, createdBy: req.user.email });
    await auditLogger({
      action: 'DEPARTMENT_CREATED',
      entity: 'Department',
      user: req.user,
      details: { departmentName: department.name },
      req,
    });

    return res.status(201).json({ success: true, data: department });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_DEPARTMENT',
        message: 'Ya existe un departamento con este nombre.',
      });
    }
    return next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Departamento no encontrado.' });
    }

    const departmentName = department.name;
    await department.deleteOne();
    await auditLogger({
      action: 'DEPARTMENT_DELETED',
      entity: 'Department',
      user: req.user,
      details: { departmentName },
      req,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = { listDepartments, createDepartment, deleteDepartment };
