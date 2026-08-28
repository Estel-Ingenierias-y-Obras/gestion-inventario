const mongoose = require('mongoose');
const Department = require('../models/Department');
const Person = require('../models/Person');
const EntraUserMonitor = require('../models/EntraUserMonitor');
const PersonMaterialAssignment = require('../models/PersonMaterialAssignment');
const auditLogger = require('../utils/auditLogger');
const { returnAssignmentToStock } = require('../services/stockService');
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
    const department = await Department.findOne({ _id: req.params.departmentId, source: { $in: ['entra', 'virtual'] }, entraVisible: true }).lean();
    if (!department) return res.status(404).json({ success: false, message: 'Departamento no encontrado.' });
    return res.json({ success: true, data: department });
  } catch (error) { return next(error); }
};

const listPeopleCatalog = async (_req, res, next) => {
  try {
    const people = await Person.aggregate([
      { $match: { deleted: { $ne: true }, source: 'entra', entraVisible: true, entraDeactivationStatus: { $ne: 'PENDING' } } },
      { $lookup: { from: 'departments', localField: 'departmentId', foreignField: '_id', as: 'department' } },
      { $unwind: '$department' },
      { $project: { _id: 1, nombreCompleto: 1, departmentId: 1, departmentName: '$department.name' } },
      { $sort: { departmentName: 1, nombreCompleto: 1, _id: 1 } },
    ]).collation({ locale: 'es', strength: 2 });
    return res.json({ success: true, data: people });
  } catch (error) { return next(error); }
};

const listPendingDeactivations = async (_req, res, next) => {
  try {
    const people = await Person.aggregate([
      { $match: { source: 'entra', entraDeactivationStatus: 'PENDING', deleted: { $ne: true } } },
      { $lookup: { from: 'departments', localField: 'departmentId', foreignField: '_id', as: 'department' } },
      { $lookup: { from: 'personMaterialAssignments', let: { person: '$_id' }, pipeline: [
        {
          $match: {
            $expr: { $eq: ['$personId', '$$person'] },
            removed: { $ne: true },
            undone: { $ne: true },
          },
        },
        { $group: { _id: null, assignments: { $sum: 1 }, units: { $sum: '$cantidad' } } },
      ], as: 'assigned' } },
      { $set: {
        departmentName: { $ifNull: [{ $first: '$department.name' }, '$entraDepartment'] },
        assignmentCount: { $ifNull: [{ $first: '$assigned.assignments' }, 0] },
        materialUnits: { $ifNull: [{ $first: '$assigned.units' }, 0] },
      } },
      { $project: { department: 0, assigned: 0 } },
      { $sort: { nombreCompleto: 1, _id: 1 } },
    ]).collation({ locale: 'es', strength: 2 });
    return res.json({ success: true, data: people });
  } catch (error) { return next(error); }
};

const confirmDeactivation = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    let personSnapshot;
    let department;
    const returnedAssignments = [];
    await session.withTransaction(async () => {
      const person = await Person.findOne({
        _id: req.params.personId, source: 'entra', entraDeactivationStatus: 'PENDING',
      }).session(session);
      if (!person) {
        const error = new Error('La persona no está pendiente de baja.');
        error.statusCode = 409;
        error.code = 'DEACTIVATION_NOT_PENDING';
        throw error;
      }
      department = await Department.findById(person.departmentId).session(session).lean();
      const assignments = await PersonMaterialAssignment.find({
        personId: person._id, removed: { $ne: true }, undone: { $ne: true },
      }).session(session);
      for (const assignment of assignments) {
        const stockMovements = await returnAssignmentToStock({ assignment, user: req.user, session });
        returnedAssignments.push({ assignment: assignment.toObject(), stockMovements });
      }
      person.entraDeactivationStatus = 'CONFIRMED';
      person.entraVisible = false;
      person.entraDeactivationConfirmedAt = new Date();
      person.entraDeactivationConfirmedBy = req.user;
      await person.save({ session });
      await EntraUserMonitor.updateOne(
        { entraId: person.entraId },
        { $set: { status: 'CONFIRMED', confirmedAt: person.entraDeactivationConfirmedAt, confirmedBy: req.user } },
        { session }
      );
      personSnapshot = person.toObject();
    });

    for (const { assignment, stockMovements } of returnedAssignments) {
      await auditLogger({ action: 'MATERIAL_UNASSIGNED', entity: 'PersonMaterialAssignment', user: req.user,
        details: auditDetails({ department, person: personSnapshot, assignment, extra: {
          assignmentId: String(assignment._id), cantidad: assignment.cantidad,
          fecha: assignment.removedAt, origen: assignment.origen, stockDevuelto: stockMovements,
          motivo: 'AAD_USER_DEACTIVATION_CONFIRMED',
        } }), req });
    }
    await auditLogger({ action: 'AAD_USER_DEACTIVATION_CONFIRMED', entity: 'Person', user: req.user,
      details: {
        personId: String(personSnapshot._id), entraId: personSnapshot.entraId,
        usuario: personSnapshot.nombreCompleto, departamento: department?.name || personSnapshot.entraDepartment || '',
        fecha: personSnapshot.entraDeactivationConfirmedAt,
        cantidadAsignacionesDevueltas: returnedAssignments.length,
        cantidadUnidadesDevueltas: returnedAssignments.reduce((total, item) => total + Number(item.assignment.cantidad || 0), 0),
      }, req });
    return res.json({ success: true, data: {
      personId: personSnapshot._id, returnedAssignments: returnedAssignments.length,
      returnedUnits: returnedAssignments.reduce((total, item) => total + Number(item.assignment.cantidad || 0), 0),
    } });
  } catch (error) { return next(error); } finally { await session.endSession(); }
};

const listPeople = async (req, res, next) => {
  try {
    const department = await Department.findOne({ _id: req.params.departmentId, source: { $in: ['entra', 'virtual'] }, entraVisible: true }).lean();
    if (!department) return res.status(404).json({ success: false, message: 'Departamento no encontrado.' });
    const people = await Person.aggregate([
      { $match: { departmentId: department._id, deleted: { $ne: true }, source: 'entra', entraVisible: true, entraDeactivationStatus: { $ne: 'PENDING' } } },
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
    const person = await Person.findOne({ _id: req.params.personId, deleted: { $ne: true }, source: 'entra', entraVisible: true, entraDeactivationStatus: { $ne: 'PENDING' } }).lean();
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
      stockMovements = await returnAssignmentToStock({ assignment, user: req.user, session });
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
  getDepartment, listPeopleCatalog, listPendingDeactivations, confirmDeactivation,
  listPeople, createPerson, updatePerson, deletePerson,
  listAssignments, createAssignment, updateAssignmentSerial, removeAssignment, undoPersonAssignment,
};
