const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

const graphName = (user) => {
  const structured = [user.givenName, user.surname].map((value) => String(value || '').trim()).filter(Boolean).join(' ');
  return structured || String(user.displayName || user.mail || user.userPrincipalName || '').trim();
};

const buildPersonIndexes = (people, departments) => {
  const departmentById = new Map(departments.map((department) => [String(department._id), department]));
  const byEntraId = new Map();
  const byEmail = new Map();
  const byName = new Map();
  const byNameAndDepartment = new Map();
  const add = (map, key, person) => { if (key) map.set(key, [...(map.get(key) || []), person]); };
  for (const person of people) {
    if (person.entraId) add(byEntraId, String(person.entraId).toLowerCase(), person);
    const email = normalize(person.entraMail || person.email);
    add(byEmail, email, person);
    const name = normalize(person.nombreCompleto);
    const department = normalize(departmentById.get(String(person.departmentId))?.name);
    add(byName, name, person);
    add(byNameAndDepartment, `${name}|${department}`, person);
  }
  return { byEntraId, byEmail, byName, byNameAndDepartment, departmentById };
};

const matchUser = (user, indexes) => {
  const exactId = indexes.byEntraId.get(String(user.id || '').toLowerCase()) || [];
  if (exactId.length === 1) return { confidence: 'EXACT_ENTRA_ID', candidates: exactId };
  const email = normalize(user.mail || user.userPrincipalName);
  const exactEmail = indexes.byEmail.get(email) || [];
  if (exactEmail.length === 1) return { confidence: 'EXACT_EMAIL', candidates: exactEmail };
  if (exactEmail.length > 1) return { confidence: 'AMBIGUOUS', candidates: exactEmail };
  const name = normalize(graphName(user));
  const department = normalize(user.department);
  const sameNameAndDepartment = indexes.byNameAndDepartment.get(`${name}|${department}`) || [];
  if (sameNameAndDepartment.length === 1) return { confidence: 'NAME_AND_DEPARTMENT', candidates: sameNameAndDepartment };
  if (sameNameAndDepartment.length > 1) return { confidence: 'AMBIGUOUS', candidates: sameNameAndDepartment };
  const sameName = indexes.byName.get(name) || [];
  if (sameName.length === 1) return { confidence: 'NAME_ONLY', candidates: sameName };
  if (sameName.length > 1) return { confidence: 'AMBIGUOUS', candidates: sameName };
  return { confidence: 'NO_MATCH', candidates: [] };
};

module.exports = { normalize, graphName, buildPersonIndexes, matchUser };
