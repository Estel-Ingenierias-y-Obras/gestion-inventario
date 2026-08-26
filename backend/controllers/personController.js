const mongoose = require('mongoose');
const Department = require('../models/Department');
const Person = require('../models/Person');
const PersonMaterialAssignment = require('../models/PersonMaterialAssignment');
const auditLogger = require('../utils/auditLogger');
const { returnManualAssignmentToStock, returnStockToOriginalOrders } = require('../services/stockService');
const { undoAssignment } = require('../services/assignmentUndoService');

const clean = (value) => String(value ?? '').trim();
const isLaptop = (material) => clean(material).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es').includes('portatil') || clean(material).toLocaleLowerCase('es').includes('laptop');
const auditDetails = ({ department, person, assignment, extra = {} }) => ({
  departamento: department?.name || assignment?.departmentName || '',
  persona: person?.nombreCompleto || assignment?.personName || '',
  material: assignment?.material || null,
  modelo: assignment?.modelo || null,
  numeroPedido: assignment?.numeroPedido ?? null,
  numeroSerie: assignment?.numeroSerie ?? null,
  ...extra,
});

const getDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.departmentId).lean();
    if (!department) return res.status(404).json({ success: false, message: 'Departamento no encontrado.' });
    return res.json({ success: true, data: department });
  } catch (error) { return next(error); }
};

const listPeopleCatalog = async (_req, res, next) => {
  try {
    const people = await Person.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $lookup: { from: 'departments', localField: 'departmentId', foreignField: '_id', as: 'department' } },
      { $unwind: '$department' },
      { $project: { _id: 1, nombreCompleto: 1, departmentId: 1, departmentName: '$department.name' } },
      { $sort: { departmentName: 1, nombreCompleto: 1, _id: 1 } },
    ]).collation({ locale: 'es', strength: 2 });
    return res.json({ success: true, data: people });
  } catch (error) { return next(error); }
};

const listPeople = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.departmentId).lean();
    if (!department) return res.status(404).json({ success: false, message: 'Departamento no encontrado.' });
    const people = await Person.aggregate([
      { $match: { departmentId: department._id, deleted: { $ne: true } } },
      { $lookup: { from: 'personMaterialAssignments', let: { person: '$_id' }, pipeline: [
        { $match: { $expr: { $eq: ['$personId', '$$person'] }, removed: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$cantidad' } } },
      ], as: 'assigned' } },
      { $set: { materialAsignado: { $ifNull: [{ $first: '$assigned.total' }, 0] } } },
      { $unset: 'assigned' },
      { $sort: { nombreCompleto: 1, _id: 1 } },
    ]).collation({ locale: 'es', strength: 2 });
    return res.json({ success: true, data: people, department });
  } catch (error) { return next(error); }
};

const createPerson = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.departmentId).lean();
    if (!department) return res.status(404).json({ success: false, message: 'Departamento no encontrado.' });
    const person = await Person.create({
      departmentId: department._id, nombreCompleto: clean(req.body.nombreCompleto), createdBy: req.user.email,
    });
    await auditLogger({ action: 'PERSON_CREATED', entity: 'Person', user: req.user,
      details: auditDetails({ department, person, extra: { personId: String(person._id) } }), req });
    return res.status(201).json({ success: true, data: person });
  } catch (error) { return next(error); }
};

const updatePerson = async (req, res, next) => {
  try {
    const person = await Person.findOne({ _id: req.params.personId, deleted: { $ne: true } });
    if (!person) return res.status(404).json({ success: false, message: 'Persona no encontrada.' });
    const department = await Department.findById(person.departmentId).lean();
    const previousName = person.nombreCompleto;
    person.nombreCompleto = clean(req.body.nombreCompleto);
    await person.save();
    await auditLogger({ action: 'PERSON_UPDATED', entity: 'Person', user: req.user,
      details: auditDetails({ department, person, extra: { personId: String(person._id), nombreAnterior: previousName } }), req });
    return res.json({ success: true, data: person });
  } catch (error) { return next(error); }
};

const deletePerson = async (req, res, next) => {
  try {
    const person = await Person.findOneAndUpdate(
      { _id: req.params.personId, deleted: { $ne: true } },
      { $set: { deleted: true, deletedAt: new Date(), deletedBy: req.user } }, { new: true }
    );
    if (!person) return res.status(404).json({ success: false, message: 'Persona no encontrada.' });
    const department = await Department.findById(person.departmentId).lean();
    await auditLogger({ action: 'PERSON_DELETED', entity: 'Person', user: req.user,
      details: auditDetails({ department, person, extra: { personId: String(person._id) } }), req });
    return res.json({ success: true });
  } catch (error) { return next(error); }
};

const listAssignments = async (req, res, next) => {
  try {
    const person = await Person.findById(req.params.personId).lean();
    if (!person) return res.status(404).json({ success: false, message: 'Persona no encontrada.' });
    const assignments = await PersonMaterialAssignment.find({ personId: person._id, removed: { $ne: true } })
      .sort({ assignedAt: -1, _id: -1 }).lean();
    return res.json({ success: true, data: assignments, person });
  } catch (error) { return next(error); }
};

const createAssignment = async (req, res, next) => {
  try {
    const person = await Person.findOne({ _id: req.params.personId, deleted: { $ne: true } }).lean();
    if (!person) return res.status(404).json({ success: false, message: 'Persona no encontrada.' });
    const department = await Department.findById(person.departmentId).lean();
    if (!department) return res.status(409).json({ success: false, message: 'El departamento ya no existe.' });
    const material = clean(req.body.material);
    const modelo = clean(req.body.modelo);
    const cantidad = Number(req.body.cantidad);
    const numeroSerie = clean(req.body.numeroSerie) || null;
    const origen = 'manual';
    if (isLaptop(material) && !numeroSerie) {
      return res.status(400).json({ success: false, code: 'SERIAL_REQUIRED', message: 'El número de serie es obligatorio para portátiles.' });
    }
    if (isLaptop(material) && cantidad !== 1) {
      return res.status(400).json({ success: false, message: 'Asigna los portátiles de uno en uno para registrar su número de serie.' });
    }

    const assignment = await PersonMaterialAssignment.create({
      personId: person._id, departmentId: department._id,
      departmentName: department.name, personName: person.nombreCompleto,
      material, modelo, cantidad, origen, numeroSerie, numeroPedido: null,
      assignedBy: req.user.email,
    });
    await auditLogger({ action: 'MATERIAL_ASSIGNED_TO_PERSON', entity: 'PersonMaterialAssignment', user: req.user,
      details: auditDetails({ department, person, assignment, extra: {
        assignmentId: String(assignment._id), cantidad, origen,
        pedidosConsumidos: [],
      } }), req });
    return res.status(201).json({ success: true, data: assignment });
  } catch (error) { return next(error); }
};

const updateAssignmentSerial = async (req, res, next) => {
  try {
    const assignment = await PersonMaterialAssignment.findOne({
      _id: req.params.assignmentId, personId: req.params.personId, removed: { $ne: true },
    });
    if (!assignment) return res.status(404).json({ success: false, message: 'Material asignado no encontrado.' });
    const numeroSerie = clean(req.body.numeroSerie) || null;
    if (isLaptop(assignment.material) && !numeroSerie) {
      return res.status(400).json({ success: false, code: 'SERIAL_REQUIRED', message: 'El número de serie es obligatorio para portátiles.' });
    }
    assignment.numeroSerie = numeroSerie;
    await assignment.save();
    const person = await Person.findById(assignment.personId).lean();
    await auditLogger({ action: 'MATERIAL_ASSIGNED_TO_PERSON', entity: 'PersonMaterialAssignment', user: req.user,
      details: auditDetails({ person, assignment, extra: { assignmentId: String(assignment._id), operacion: 'SERIAL_UPDATED' } }), req });
    return res.json({ success: true, data: assignment });
  } catch (error) { return next(error); }
};

const removeAssignment = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    let assignment;
    let stockMovements = [];
    await session.withTransaction(async () => {
      assignment = await PersonMaterialAssignment.findOne({
        _id: req.params.assignmentId,
        personId: req.params.personId,
        removed: { $ne: true },
      }).session(session);
      if (!assignment) {
        const error = new Error('Material asignado no encontrado.');
        error.statusCode = 404;
        throw error;
      }
      if (assignment.origen === 'almacen') {
        const allocations = assignment.stockAllocations || [];
        const allocatedQuantity = allocations.reduce((total, item) => total + item.cantidadConsumida, 0);
        if (allocations.length === 0 || allocatedQuantity !== assignment.cantidad) {
          const error = new Error('La asignación no conserva una trazabilidad de stock válida.');
          error.statusCode = 409;
          error.code = 'INVALID_ASSIGNMENT_TRACE';
          throw error;
        }
        stockMovements = await returnStockToOriginalOrders({
          allocations,
          material: assignment.material,
          modelo: assignment.modelo,
          assignment,
          session,
        });
      } else {
        stockMovements = await returnManualAssignmentToStock({
          assignment,
          createdBy: req.user?.email || assignment.assignedBy,
          session,
        });
      }
      assignment.removed = true;
      assignment.removedAt = new Date();
      assignment.removedBy = req.user;
      await assignment.save({ session });
    });
    const person = await Person.findById(assignment.personId).lean();
    await auditLogger({ action: 'MATERIAL_UNASSIGNED', entity: 'PersonMaterialAssignment', user: req.user,
      details: auditDetails({ person, assignment, extra: {
        assignmentId: String(assignment._id),
        cantidad: assignment.cantidad,
        fecha: assignment.removedAt,
        origen: assignment.origen,
        stockDevuelto: stockMovements,
      } }), req });
    return res.json({ success: true, data: { stockReturned: stockMovements } });
  } catch (error) { return next(error); } finally { await session.endSession(); }
};

const undoPersonAssignment = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    let assignmentSnapshot;
    let stockMovements = [];
    await session.withTransaction(async () => {
      const assignment = await PersonMaterialAssignment.findOne({
        _id: req.params.assignmentId, personId: req.params.personId, removed: { $ne: true },
      }).session(session);
      if (!assignment) {
        const error = new Error('Material asignado no encontrado.');
        error.statusCode = 404;
        throw error;
      }
      stockMovements = await undoAssignment({
        assignment, createdBy: req.user?.email || assignment.assignedBy, session,
      });
      assignmentSnapshot = assignment.toObject();
    });
    const person = await Person.findById(assignmentSnapshot.personId).lean();
    await auditLogger({
      action: 'MATERIAL_ASSIGNMENT_UNDONE', entity: 'PersonMaterialAssignment', user: req.user,
      details: auditDetails({ person, assignment: assignmentSnapshot, extra: {
        assignmentId: String(assignmentSnapshot._id), fecha: assignmentSnapshot.undoneAt,
        cantidad: assignmentSnapshot.cantidad, motivo: assignmentSnapshot.undoReason,
        estadoTecnico: 'UNDONE', stockRestaurado: stockMovements,
      } }), req,
    });
    return res.json({ success: true, data: { stockReturned: stockMovements } });
  } catch (error) { return next(error); } finally { await session.endSession(); }
};

module.exports = {
  getDepartment, listPeopleCatalog, listPeople, createPerson, updatePerson, deletePerson,
  listAssignments, createAssignment, updateAssignmentSerial, removeAssignment, undoPersonAssignment,
};
