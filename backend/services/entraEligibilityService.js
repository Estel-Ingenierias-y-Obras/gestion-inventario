const { normalize } = require('./entraMatchingService');

const ALLOWED_COUNTRIES = new Set(['espana', 'spain']);
const departmentKey = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-ES');

const getEligibility = (user, allowedSkuIds, skuById = new Map()) => {
  const assignedSkuIds = (user.assignedLicenses || []).map(({ skuId }) => String(skuId).toLowerCase());
  const matchedAllowedSkus = assignedSkuIds.filter((skuId) => allowedSkuIds.has(skuId))
    .map((skuId) => ({ skuId, skuPartNumber: skuById.get(skuId)?.skuPartNumber || '' }));
  const department = String(user.department || '').trim().replace(/\s+/g, ' ');
  const country = normalize(user.country);
  const reasons = [
    matchedAllowedSkus.length === 0 && 'LICENSE_NOT_ALLOWED',
    !department && 'DEPARTMENT_NOT_PROVIDED',
    department && (department.length < 2 || department.length > 100) && 'DEPARTMENT_INVALID',
    !String(user.givenName || '').trim() && 'GIVEN_NAME_NOT_PROVIDED',
    !String(user.surname || '').trim() && 'SURNAME_NOT_PROVIDED',
    !country && 'COUNTRY_NOT_PROVIDED',
    country && !ALLOWED_COUNTRIES.has(country) && 'COUNTRY_NOT_ALLOWED',
  ].filter(Boolean);
  return { eligible: reasons.length === 0, reasons, assignedSkuIds, matchedAllowedSkus, department };
};

module.exports = { getEligibility, departmentKey };
