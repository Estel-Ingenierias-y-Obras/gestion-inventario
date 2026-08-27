const mongoose = require('mongoose');
const Department = require('../models/Department');
const Person = require('../models/Person');
const { listSubscribedSkus, listAllUsers } = require('./entraGraphService');
const { graphName } = require('./entraMatchingService');
const { configuredSkuPartNumbers } = require('./entraSimulationService');
const { getEligibility, departmentKey } = require('./entraEligibilityService');

const departmentFor = (user) => {
  const raw = String(user.department || '').trim().replace(/\s+/g, ' ');
  return { key: `entra:${departmentKey(raw)}`, name: raw, source: 'entra' };
};

const synchronizeCatalog = async ({ triggeredBy }) => {
  const [skus, users] = await Promise.all([listSubscribedSkus(), listAllUsers()]);
  const allowedParts = new Set(configuredSkuPartNumbers());
  const allowedSkus = skus.filter((sku) => allowedParts.has(String(sku.skuPartNumber).toUpperCase()));
  if (allowedSkus.length !== allowedParts.size) {
    const error = new Error('No se han podido resolver todos los SKU permitidos en el tenant.');
    error.statusCode = 409;
    error.code = 'ENTRA_SKU_CONFIGURATION_INVALID';
    throw error;
  }
  const allowedSkuIds = new Set(allowedSkus.map((sku) => String(sku.skuId).toLowerCase()));
  const skuById = new Map(skus.map((sku) => [String(sku.skuId).toLowerCase(), sku]));
  const eligibleUsers = users.filter((user) => getEligibility(user, allowedSkuIds, skuById).eligible);
  const now = new Date();
  const departmentsToSync = new Map(eligibleUsers.map((user) => {
    const department = departmentFor(user);
    return [department.key, department];
  }));
  const session = await mongoose.startSession();
  try {
    let createdDepartments = 0;
    let adoptedDepartments = 0;
    let createdPeople = 0;
    let updatedPeople = 0;
    await session.withTransaction(async () => {
      await Department.updateMany(
        { source: { $in: ['entra', 'virtual'] } },
        { $set: { entraVisible: false } },
        { session }
      );
      await Person.updateMany({ source: 'entra' }, { $set: { entraVisible: false } }, { session });
      const existingDepartments = await Department.find().session(session);
      const byKey = new Map(existingDepartments.filter((item) => item.entraKey).map((item) => [item.entraKey, item]));
      const byName = new Map(existingDepartments.map((item) => [departmentKey(item.name), item]));
      for (const departmentData of departmentsToSync.values()) {
        let department = byKey.get(departmentData.key) || byName.get(departmentKey(departmentData.name));
        if (!department) {
          [department] = await Department.create([{
            name: departmentData.name, createdBy: 'entra-sync@system', source: departmentData.source,
            entraKey: departmentData.key, entraVisible: true, entraLastSeenAt: now,
          }], { session });
          createdDepartments += 1;
        } else {
          if (department.source === 'legacy') adoptedDepartments += 1;
          department.source = departmentData.source;
          department.entraKey = departmentData.key;
          department.entraVisible = true;
          department.entraLastSeenAt = now;
          await department.save({ session });
        }
        byKey.set(departmentData.key, department);
      }

      for (const user of eligibleUsers) {
        const departmentData = departmentFor(user);
        const department = byKey.get(departmentData.key);
        const assignedLicenses = (user.assignedLicenses || []).map(({ skuId }) => String(skuId).toLowerCase());
        const person = await Person.findOne({ entraId: user.id }).session(session);
        const synchronizedName = String(graphName(user) || `Usuario ${String(user.id).slice(0, 8)}`).slice(0, 150);
        const values = {
          departmentId: department._id, nombreCompleto: synchronizedName, source: 'entra', entraId: user.id,
          entraMail: user.mail || user.userPrincipalName || null, entraDisplayName: user.displayName || null,
          entraGivenName: user.givenName || null, entraSurname: user.surname || null,
          entraDepartment: user.department || null, entraAssignedLicenses: assignedLicenses,
          entraVisible: true, entraLastSeenAt: now, deleted: false, deletedAt: null, deletedBy: null,
        };
        if (!person) {
          await Person.create([{ ...values, createdBy: 'entra-sync@system' }], { session });
          createdPeople += 1;
        } else {
          Object.assign(person, values);
          await person.save({ session });
          updatedPeople += 1;
        }
      }
    });
    return {
      synchronizedAt: now, triggeredBy, usersRead: users.length, eligibleUsers: eligibleUsers.length,
      departmentsVisible: departmentsToSync.size, createdDepartments, adoptedDepartments,
      createdPeople, updatedPeople, allowedSkus,
    };
  } finally { await session.endSession(); }
};

module.exports = { synchronizeCatalog };
