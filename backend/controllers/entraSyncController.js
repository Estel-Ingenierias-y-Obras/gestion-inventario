const mongoose = require('mongoose');
const EntraSyncRun = require('../models/EntraSyncRun');
const EntraSyncItem = require('../models/EntraSyncItem');
const { runSimulation } = require('../services/entraSimulationService');
const { synchronizeCatalog } = require('../services/entraCatalogService');

const ensureSimulationEnabled = (res) => {
  const mode = String(process.env.ENTRA_SYNC_MODE || 'simulation').toLowerCase();
  const enabled = String(process.env.ENTRA_SIMULATION_ENABLED || 'true').toLowerCase() === 'true';
  if (mode !== 'simulation' || !enabled) {
    res.status(503).json({ success: false, code: 'ENTRA_SIMULATION_DISABLED', message: 'El modo simulación de Entra no está activo.' });
    return false;
  }
  return true;
};

const startSimulation = async (req, res, next) => {
  if (!ensureSimulationEnabled(res)) return;
  try {
    const run = await runSimulation({
      trigger: req.automation ? 'AUTOMATION' : 'MANUAL',
      triggeredBy: req.user ? { name: req.user.name, email: req.user.email, oid: req.user.oid } : null,
    });
    return res.status(201).json({ success: true, data: run });
  } catch (error) { return next(error); }
};

const synchronizeEntraCatalog = async (req, res, next) => {
  try {
    const result = await synchronizeCatalog({
      triggeredBy: req.user ? { name: req.user.name, email: req.user.email, oid: req.user.oid } : null,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) { return next(error); }
};

const pagination = (req, defaultLimit = 20) => {
  const parsedPage = Number(req.query.page);
  const parsedLimit = Number(req.query.limit);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
};

const listSimulations = async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req);
    const [runs, total] = await Promise.all([
      EntraSyncRun.find().sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
      EntraSyncRun.countDocuments(),
    ]);
    return res.json({ success: true, data: runs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
};

const getSimulation = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.runId)) return res.status(400).json({ success: false, message: 'Identificador de simulación no válido.' });
    const run = await EntraSyncRun.findById(req.params.runId).lean();
    if (!run) return res.status(404).json({ success: false, message: 'Simulación no encontrada.' });
    return res.json({ success: true, data: run });
  } catch (error) { return next(error); }
};

const listSimulationItems = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.runId)) return res.status(400).json({ success: false, message: 'Identificador de simulación no válido.' });
    const { page, limit, skip } = pagination(req, 50);
    const filter = { runId: req.params.runId };
    if (req.query.type) filter.type = String(req.query.type).trim().toUpperCase();
    const sort = filter.type === 'DEPARTMENT'
      ? { 'details.userCount': -1, department: 1, _id: 1 }
      : { type: 1, displayName: 1, _id: 1 };
    const [items, total] = await Promise.all([
      EntraSyncItem.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      EntraSyncItem.countDocuments(filter),
    ]);
    return res.json({ success: true, data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { return next(error); }
};

module.exports = { startSimulation, synchronizeEntraCatalog, listSimulations, getSimulation, listSimulationItems };
