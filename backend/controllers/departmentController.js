const Department = require('../models/Department');
const Person = require('../models/Person');
const PersonMaterialAssignment = require('../models/PersonMaterialAssignment');
const auditLogger = require('../utils/auditLogger');

const listDepartments = async (_req, res, next) => {
  try {
    const departments = await Department.find({ source: { $in: ['entra', 'virtual'] }, entraVisible: true })
      .collation({ locale: 'es', strength: 2 })
      .sort({ name: 1, _id: 1 })
      .lean();
    const departmentIds = departments.map((department) => department._id);
    const visiblePeople = await Person.find({
      departmentId: { $in: departmentIds }, source: 'entra', entraVisible: true,
      entraDeactivationStatus: { $ne: 'PENDING' }, deleted: { $ne: true },
    }).select('_id departmentId').lean();
    const employeeCountByDepartment = new Map();
    const departmentByPerson = new Map();
    visiblePeople.forEach((person) => {
      const departmentId = String(person.departmentId);
      departmentByPerson.set(String(person._id), departmentId);
      employeeCountByDepartment.set(departmentId, (employeeCountByDepartment.get(departmentId) || 0) + 1);
    });
    const materialByPerson = visiblePeople.length ? await PersonMaterialAssignment.aggregate([
      { $match: { personId: { $in: visiblePeople.map((person) => person._id) }, removed: { $ne: true }, undone: { $ne: true } } },
      { $group: { _id: '$personId', units: { $sum: '$cantidad' } } },
    ]) : [];
    const materialCountByDepartment = new Map();
    materialByPerson.forEach(({ _id, units }) => {
      const departmentId = departmentByPerson.get(String(_id));
      if (!departmentId) return;
      materialCountByDepartment.set(
        departmentId,
        (materialCountByDepartment.get(departmentId) || 0) + Number(units || 0)
      );
    });
    const data = departments.map((department) => ({
      ...department,
      employeeCount: employeeCountByDepartment.get(String(department._id)) || 0,
      materialCount: materialCountByDepartment.get(String(department._id)) || 0,
    }));
    return res.status(200).json({ success: true, data });
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
    const peopleCount = await Person.countDocuments({ departmentId: department._id, deleted: { $ne: true } });
    if (peopleCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'No se puede eliminar un departamento que contiene personas.',
      });
    }
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
