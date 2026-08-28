const EntraSyncRun = require('../models/EntraSyncRun');
const EntraSyncItem = require('../models/EntraSyncItem');
const Person = require('../models/Person');
const Department = require('../models/Department');
const PersonMaterialAssignment = require('../models/PersonMaterialAssignment');
const EntraUserMonitor = require('../models/EntraUserMonitor');
const EntraMonitoringState = require('../models/EntraMonitoringState');
const { listSubscribedSkus, listAllUsers } = require('./entraGraphService');
const { graphName } = require('./entraMatchingService');
const { getEligibility, departmentKey } = require('./entraEligibilityService');

const DEFAULT_ALLOWED_SKUS = ['SPB', 'O365_BUSINESS_PREMIUM', 'O365_BUSINESS_ESSENTIALS'];

const configuredSkuPartNumbers = () => {
  const configured = String(process.env.ENTRA_ALLOWED_SKU_PART_NUMBERS || '').split(',')
    .map((value) => value.trim().toUpperCase()).filter(Boolean);
  return configured.length ? [...new Set(configured)] : DEFAULT_ALLOWED_SKUS;
};

const assignmentTraceability = (assignment) => {
  const problems = [];
  if (assignment.origen === 'almacen') {
    const allocations = assignment.stockAllocations || [];
    const allocated = allocations.reduce((total, item) => total + Number(item.cantidadConsumida || 0), 0);
    if (allocations.length === 0) problems.push({ code: 'MISSING_STOCK_ALLOCATIONS' });
    if (allocated !== assignment.cantidad) {
      problems.push({ code: 'ALLOCATION_QUANTITY_MISMATCH', assigned: assignment.cantidad, allocated });
    }
  }
  return problems;
};

const materialPreview = (assignments) => assignments.map((assignment) => ({
  assignmentId: String(assignment._id),
  material: assignment.material,
  modelo: assignment.modelo,
  numeroSerie: assignment.numeroSerie || null,
  numeroPedido: assignment.numeroPedido || null,
  cantidad: assignment.cantidad,
  origen: assignment.origen,
}));

const safeError = (error) => ({
  code: error.graphCode || error.code || error.name || 'SIMULATION_FAILED',
  status: error.graphStatus || error.statusCode || null,
  requestId: error.graphRequestId || null,
  message: error.message,
});

const runSimulation = async ({ trigger, triggeredBy }) => {
  let run;
  try {
    run = await EntraSyncRun.create({
      mode: 'SIMULATION', status: 'RUNNING', activeLock: 'ENTRA_SIMULATION',
      trigger, triggeredBy, configuredSkuPartNumbers: configuredSkuPartNumbers(),
    });
  } catch (error) {
    if (error?.code === 11000) {
      const conflict = new Error('Ya hay una simulación de Entra en ejecución.');
      conflict.statusCode = 409;
      conflict.code = 'ENTRA_SIMULATION_RUNNING';
      throw conflict;
    }
    throw error;
  }

  try {
    const [skus, users, people, departments, monitors, monitoringState] = await Promise.all([
      listSubscribedSkus(), listAllUsers(),
      Person.find({ deleted: { $ne: true } }).lean(), Department.find().lean(),
      EntraUserMonitor.find().lean(),
      EntraMonitoringState.findOne({ key: 'USER_DEACTIVATION_MONITORING' }).lean(),
    ]);
    const allowedPartNumbers = configuredSkuPartNumbers();
    const allowedSet = new Set(allowedPartNumbers);
    const skuById = new Map(skus.map((sku) => [String(sku.skuId).toLowerCase(), sku]));
    const resolvedAllowedSkus = skus.filter((sku) => allowedSet.has(String(sku.skuPartNumber).toUpperCase()));
    const resolvedPartNumbers = new Set(resolvedAllowedSkus.map((sku) => String(sku.skuPartNumber).toUpperCase()));
    const missingConfiguredSkus = allowedPartNumbers.filter((sku) => !resolvedPartNumbers.has(sku));
    const allowedSkuIds = new Set(resolvedAllowedSkus.map((sku) => String(sku.skuId).toLowerCase()));
    const personByEntraId = new Map(people.filter((person) => person.entraId)
      .map((person) => [String(person.entraId).toLowerCase(), person]));
    const items = [];
    const departmentsFound = new Map();
    const departmentCounts = new Map();
    const graphUserById = new Map();
    const monitorByEntraId = new Map(monitors.map((monitor) => [monitor.entraId.toLowerCase(), monitor]));
    const assignmentsByPerson = new Map();
    const deactivationPersonIds = new Set();

    const assignments = await PersonMaterialAssignment.find({ removed: { $ne: true }, undone: { $ne: true } }).lean();
    assignments.forEach((assignment) => {
      const personId = String(assignment.personId);
      assignmentsByPerson.set(personId, [...(assignmentsByPerson.get(personId) || []), assignment]);
    });

    for (const user of users) {
      graphUserById.set(String(user.id).toLowerCase(), user);
      const eligibility = getEligibility(user, allowedSkuIds, skuById);
      const { assignedSkuIds, matchedAllowedSkus, reasons, eligible, department } = eligibility;
      const reason = reasons.join(',');
      const dataIssues = reasons.filter((item) => [
        'DEPARTMENT_NOT_PROVIDED', 'DEPARTMENT_INVALID',
        'GIVEN_NAME_NOT_PROVIDED', 'SURNAME_NOT_PROVIDED',
      ].includes(item));
      const candidate = personByEntraId.get(String(user.id).toLowerCase());
      const common = {
        entraId: user.id, personId: candidate?._id || null,
        departmentId: candidate?.departmentId || null,
        displayName: graphName(user), mail: user.mail || user.userPrincipalName || '', department,
        licenseSkuIds: assignedSkuIds, matchedAllowedSkus, dataIssues,
        matching: {
          confidence: candidate ? 'EXACT_ENTRA_ID' : 'NO_MATCH',
          candidatePersonIds: candidate ? [String(candidate._id)] : [],
          automaticLinkAllowed: Boolean(candidate),
        },
        details: {
          givenName: user.givenName || '', surname: user.surname || '',
          displayName: user.displayName || '', accountEnabled: user.accountEnabled,
          userType: user.userType || '', originalDepartment: user.department || '',
          country: user.country || '',
          exclusionReasons: reasons,
        },
      };
      items.push({ type: eligible ? 'ELIGIBLE_USER' : 'EXCLUDED_USER', ...common, reason });
      if (eligible) {
        const key = departmentKey(department);
        departmentsFound.set(key, department);
        departmentCounts.set(key, (departmentCounts.get(key) || 0) + 1);
      }
    }

    for (const [key, name] of departmentsFound) {
      items.push({
        type: 'DEPARTMENT', department: name,
        classification: 'ENTRA',
        details: { userCount: departmentCounts.get(key) || 0 },
      });
    }

    for (const department of departments.filter((item) => item.entraVisible
      && ['entra', 'virtual'].includes(item.source))) {
      if (departmentsFound.has(departmentKey(department.name))) continue;
      items.push({
        type: 'DEPARTMENT_REMOVAL_PREVIEW', departmentId: department._id,
        department: department.name, reason: 'NO_ELIGIBLE_USERS',
        classification: 'WOULD_BE_HIDDEN', details: { destructiveDelete: false },
      });
    }

    for (const person of people) {
      if (!person.entraId) continue;
      if (deactivationPersonIds.has(String(person._id))) continue;
      if (!monitoringState?.initialized) continue;
      const monitor = monitorByEntraId.get(String(person.entraId).toLowerCase());
      if (!monitor || monitor.status !== 'ACTIVE') continue;
      const graphUser = graphUserById.get(String(person.entraId).toLowerCase());
      if (!graphUser) continue;
      const eligibility = getEligibility(graphUser, allowedSkuIds, skuById);
      const reason = [
        eligibility.reasons.includes('LICENSE_NOT_ALLOWED') && 'LICENSE_REMOVED',
        eligibility.reasons.includes('COUNTRY_NOT_PROVIDED') && 'COUNTRY_REMOVED',
        eligibility.reasons.includes('COUNTRY_NOT_ALLOWED') && 'COUNTRY_CHANGED',
      ].filter(Boolean).join(',');
      if (!reason) continue;
      const personAssignments = assignmentsByPerson.get(String(person._id)) || [];
      const preview = materialPreview(personAssignments);
      const traceabilityProblems = personAssignments.flatMap((assignment) => assignmentTraceability(assignment)
        .map((problem) => ({ ...problem, assignmentId: String(assignment._id) })));
      const base = {
        entraId: person.entraId, personId: person._id, departmentId: person.departmentId,
        displayName: person.nombreCompleto, reason, materialPreview: preview, traceabilityProblems,
        matching: { confidence: 'EXACT_ENTRA_ID', automaticLinkAllowed: true },
      };
      items.push({ type: 'POTENTIAL_DEACTIVATION', ...base });
      if (preview.length) items.push({ type: 'MATERIAL_RETURN_PREVIEW', ...base });
      if (traceabilityProblems.length) items.push({ type: 'TRACEABILITY_PROBLEM', ...base });
    }

    if (items.length) await EntraSyncItem.insertMany(items.map((item) => ({ ...item, runId: run._id })));
    const count = (type) => items.filter((item) => item.type === type).length;
    const counters = {
      usersRead: users.length,
      usersEligible: count('ELIGIBLE_USER'), usersExcluded: count('EXCLUDED_USER'),
      usersExcludedByCountry: items.filter((item) => item.type === 'EXCLUDED_USER'
        && item.details?.exclusionReasons?.some((value) => ['COUNTRY_NOT_ALLOWED', 'COUNTRY_NOT_PROVIDED'].includes(value))).length,
      usersExcludedByLicense: items.filter((item) => item.type === 'EXCLUDED_USER' && item.details?.exclusionReasons?.includes('LICENSE_NOT_ALLOWED')).length,
      usersExcludedMissingDepartment: items.filter((item) => item.type === 'EXCLUDED_USER'
        && item.details?.exclusionReasons?.some((value) => ['DEPARTMENT_NOT_PROVIDED', 'DEPARTMENT_INVALID'].includes(value))).length,
      usersExcludedMissingGivenName: items.filter((item) => item.type === 'EXCLUDED_USER' && item.details?.exclusionReasons?.includes('GIVEN_NAME_NOT_PROVIDED')).length,
      usersExcludedMissingSurname: items.filter((item) => item.type === 'EXCLUDED_USER' && item.details?.exclusionReasons?.includes('SURNAME_NOT_PROVIDED')).length,
      departmentsDetected: count('DEPARTMENT'),
      departmentsToRemove: count('DEPARTMENT_REMOVAL_PREVIEW'),
      potentialCreates: 0, potentialMatches: 0,
      potentialDeactivations: count('POTENTIAL_DEACTIVATION'),
      materialAssignmentsToReturn: items.filter((item) => item.type === 'MATERIAL_RETURN_PREVIEW')
        .reduce((total, item) => total + item.materialPreview.length, 0),
      materialUnitsToReturn: items.filter((item) => item.type === 'MATERIAL_RETURN_PREVIEW')
        .flatMap((item) => item.materialPreview).reduce((total, item) => total + Number(item.cantidad || 0), 0),
      traceabilityProblems: count('TRACEABILITY_PROBLEM'),
    };
    const status = missingConfiguredSkus.length ? 'CONFIGURATION_PENDING' : 'COMPLETED';
    await EntraSyncRun.updateOne({ _id: run._id }, {
      $set: {
        status, completedAt: new Date(), detectedSkus: skus, resolvedAllowedSkus,
        licenseConfigurationPending: missingConfiguredSkus.length > 0,
        counters: { ...counters, missingConfiguredSkus },
      },
      $unset: { activeLock: 1 },
    });
    return EntraSyncRun.findById(run._id).lean();
  } catch (error) {
    await EntraSyncRun.updateOne({ _id: run._id }, {
      $set: { status: 'FAILED', completedAt: new Date(), error: safeError(error) },
      $unset: { activeLock: 1 },
    });
    throw error;
  }
};

module.exports = { runSimulation, configuredSkuPartNumbers };
