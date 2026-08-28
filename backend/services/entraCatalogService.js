const mongoose = require('mongoose');
const Department = require('../models/Department');
const Person = require('../models/Person');
const EntraUserMonitor = require('../models/EntraUserMonitor');
const EntraMonitoringState = require('../models/EntraMonitoringState');
const { listSubscribedSkus, listAllUsers } = require('./entraGraphService');
const { graphName } = require('./entraMatchingService');
const { configuredSkuPartNumbers } = require('./entraSimulationService');
const { getEligibility, departmentKey } = require('./entraEligibilityService');

const MONITORING_KEY = 'USER_DEACTIVATION_MONITORING';
const departmentFor = (user) => {
  const raw = String(user.department || '').trim().replace(/\s+/g, ' ');
  return { key: `entra:${departmentKey(raw)}`, name: raw, source: 'entra' };
};
const observationFor = (user, eligibility, now) => ({
  country: String(user.country || '').trim(),
  allowedSkuIds: eligibility.matchedAllowedSkus.map((sku) => sku.skuId),
  allowedSkuPartNumbers: eligibility.matchedAllowedSkus.map((sku) => sku.skuPartNumber),
  hasAllowedLicense: eligibility.matchedAllowedSkus.length > 0,
  isSpanishCountry: !eligibility.reasons.some((reason) => ['COUNTRY_NOT_ALLOWED', 'COUNTRY_NOT_PROVIDED'].includes(reason)),
  observedAt: now, lastSeenAt: now,
});
const transitionReason = (observation) => [
  !observation.hasAllowedLicense && 'LICENSE_REMOVED',
  !observation.isSpanishCountry && (observation.country ? 'COUNTRY_CHANGED' : 'COUNTRY_REMOVED'),
].filter(Boolean).join(',');

const synchronizeCatalog = async ({ triggeredBy }) => {
  const [skus, users] = await Promise.all([listSubscribedSkus(), listAllUsers()]);
  const allowedParts = new Set(configuredSkuPartNumbers());
  const allowedSkus = skus.filter((sku) => allowedParts.has(String(sku.skuPartNumber).toUpperCase()));
  if (allowedSkus.length !== allowedParts.size) {
    const error = new Error('No se han podido resolver todos los SKU permitidos en el tenant.');
    error.statusCode = 409; error.code = 'ENTRA_SKU_CONFIGURATION_INVALID'; throw error;
  }
  const allowedSkuIds = new Set(allowedSkus.map((sku) => String(sku.skuId).toLowerCase()));
  const skuById = new Map(skus.map((sku) => [String(sku.skuId).toLowerCase(), sku]));
  const graphByEntraId = new Map(users.map((user) => {
    const eligibility = getEligibility(user, allowedSkuIds, skuById);
    return [String(user.id).toLowerCase(), { user, eligibility }];
  }));
  const eligibleUsers = [...graphByEntraId.values()].filter(({ eligibility }) => eligibility.eligible).map(({ user }) => user);
  const now = new Date();
  const departmentsToSync = new Map(eligibleUsers.map((user) => {
    const department = departmentFor(user); return [department.key, department];
  }));
  const session = await mongoose.startSession();
  try {
    let createdDepartments = 0; let adoptedDepartments = 0;
    let createdPeople = 0; let updatedPeople = 0;
    let newActiveUsers = 0; let pendingDetected = 0; let baselineInitialized = false;
    await session.withTransaction(async () => {
      let monitoringState = await EntraMonitoringState.findOne({ key: MONITORING_KEY }).session(session);
      const monitors = await EntraUserMonitor.find().session(session);
      const monitorByEntraId = new Map(monitors.map((monitor) => [monitor.entraId.toLowerCase(), monitor]));
      if (!monitoringState?.initialized) {
        baselineInitialized = true;
        for (const user of eligibleUsers) {
          const key = String(user.id).toLowerCase();
          const observation = observationFor(user, graphByEntraId.get(key).eligibility, now);
          let monitor = monitorByEntraId.get(key);
          if (!monitor) {
            [monitor] = await EntraUserMonitor.create([{
              entraId: user.id, status: 'ACTIVE', monitoringStartedAt: now,
              baseline: observation, lastObservation: observation, baselineVersion: 1,
            }], { session });
          } else {
            Object.assign(monitor, { status: 'ACTIVE', monitoringStartedAt: now,
              baseline: observation, lastObservation: observation, pendingReason: null,
              pendingDetectedAt: null, confirmedAt: null, confirmedBy: null });
            await monitor.save({ session });
          }
          monitorByEntraId.set(key, monitor);
        }
        if (!monitoringState) {
          [monitoringState] = await EntraMonitoringState.create([{
            key: MONITORING_KEY, initialized: true, initializedAt: now,
            baselineVersion: 1, monitoredUsers: eligibleUsers.length, lastSyncAt: now,
          }], { session });
        } else {
          Object.assign(monitoringState, { initialized: true, initializedAt: now, baselineVersion: 1,
            monitoredUsers: eligibleUsers.length, lastSyncAt: now });
          await monitoringState.save({ session });
        }
      } else {
        for (const monitor of monitors) {
          const graphEntry = graphByEntraId.get(monitor.entraId.toLowerCase());
          if (!graphEntry) continue;
          const observation = observationFor(graphEntry.user, graphEntry.eligibility, now);
          if (monitor.status === 'ACTIVE') {
            const reason = transitionReason(observation);
            if (reason) {
              monitor.status = 'PENDING'; monitor.pendingReason = reason;
              monitor.pendingDetectedAt = now; pendingDetected += 1;
            }
          } else if (monitor.status === 'PENDING'
            && observation.hasAllowedLicense && observation.isSpanishCountry) {
            Object.assign(monitor, { status: 'ACTIVE', pendingReason: null, pendingDetectedAt: null,
              confirmedAt: null, confirmedBy: null });
          } else if (monitor.status === 'CONFIRMED' && graphEntry.eligibility.eligible) {
            Object.assign(monitor, { status: 'ACTIVE', pendingReason: null, pendingDetectedAt: null,
              confirmedAt: null, confirmedBy: null });
          }
          monitor.lastObservation = observation;
          await monitor.save({ session });
        }
        for (const user of eligibleUsers) {
          const key = String(user.id).toLowerCase();
          if (monitorByEntraId.has(key)) continue;
          const observation = observationFor(user, graphByEntraId.get(key).eligibility, now);
          const [monitor] = await EntraUserMonitor.create([{
            entraId: user.id, status: 'ACTIVE', monitoringStartedAt: now,
            baseline: observation, lastObservation: observation, baselineVersion: monitoringState.baselineVersion,
          }], { session });
          monitorByEntraId.set(key, monitor); newActiveUsers += 1;
        }
        monitoringState.monitoredUsers = monitorByEntraId.size;
        monitoringState.lastSyncAt = now;
        await monitoringState.save({ session });
      }

      await Department.updateMany({ source: { $in: ['entra', 'virtual'] } }, { $set: { entraVisible: false } }, { session });
      const existingDepartments = await Department.find().session(session);
      const byKey = new Map(existingDepartments.filter((item) => item.entraKey).map((item) => [item.entraKey, item]));
      const byName = new Map(existingDepartments.map((item) => [departmentKey(item.name), item]));
      for (const data of departmentsToSync.values()) {
        let department = byKey.get(data.key) || byName.get(departmentKey(data.name));
        if (!department) {
          [department] = await Department.create([{ name: data.name, createdBy: 'entra-sync@system', source: data.source,
            entraKey: data.key, entraVisible: true, entraLastSeenAt: now }], { session });
          createdDepartments += 1;
        } else {
          if (department.source === 'legacy') adoptedDepartments += 1;
          Object.assign(department, { source: data.source, entraKey: data.key, entraVisible: true, entraLastSeenAt: now });
          await department.save({ session });
        }
        byKey.set(data.key, department);
      }

      const existingPeople = await Person.find({ source: 'entra' }).session(session);
      const personByEntraId = new Map(existingPeople.map((person) => [String(person.entraId).toLowerCase(), person]));
      for (const person of existingPeople) {
        const key = String(person.entraId || '').toLowerCase();
        const monitor = monitorByEntraId.get(key); const graphEntry = graphByEntraId.get(key);
        if (monitor?.status === 'PENDING') {
          Object.assign(person, { entraDeactivationStatus: 'PENDING', entraDeactivationReason: monitor.pendingReason,
            entraDeactivationDetectedAt: monitor.pendingDetectedAt, entraVisible: true });
        } else if (monitor?.status === 'CONFIRMED') {
          person.entraDeactivationStatus = 'CONFIRMED'; person.entraVisible = false;
        } else if (!graphEntry?.eligibility.eligible) {
          Object.assign(person, { entraDeactivationStatus: monitor ? 'ACTIVE' : 'UNMONITORED',
            entraDeactivationReason: null, entraDeactivationDetectedAt: null, entraVisible: false });
        }
        await person.save({ session });
      }

      for (const user of eligibleUsers) {
        const key = String(user.id).toLowerCase(); const data = departmentFor(user);
        const department = byKey.get(data.key); const person = personByEntraId.get(key);
        const assignedLicenses = (user.assignedLicenses || []).map(({ skuId }) => String(skuId).toLowerCase());
        const values = { departmentId: department._id,
          nombreCompleto: String(graphName(user) || `Usuario ${String(user.id).slice(0, 8)}`).slice(0, 150),
          source: 'entra', entraId: user.id, entraMail: user.mail || user.userPrincipalName || null,
          entraDisplayName: user.displayName || null, entraGivenName: user.givenName || null,
          entraSurname: user.surname || null, entraDepartment: user.department || null,
          entraAssignedLicenses: assignedLicenses, entraVisible: true, entraLastSeenAt: now,
          deleted: false, deletedAt: null, deletedBy: null, entraDeactivationStatus: 'ACTIVE',
          entraDeactivationReason: null, entraDeactivationDetectedAt: null,
          entraDeactivationConfirmedAt: null, entraDeactivationConfirmedBy: null };
        if (!person) {
          await Person.create([{ ...values, createdBy: 'entra-sync@system' }], { session }); createdPeople += 1;
        } else { Object.assign(person, values); await person.save({ session }); updatedPeople += 1; }
      }
    });
    return { synchronizedAt: now, triggeredBy, usersRead: users.length, eligibleUsers: eligibleUsers.length,
      departmentsVisible: departmentsToSync.size, createdDepartments, adoptedDepartments,
      createdPeople, updatedPeople, allowedSkus, baselineInitialized, newActiveUsers, pendingDetected };
  } finally { await session.endSession(); }
};

module.exports = { synchronizeCatalog };
