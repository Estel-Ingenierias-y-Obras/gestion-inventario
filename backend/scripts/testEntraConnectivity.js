require('dotenv').config({ quiet: true });

const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const REQUEST_TIMEOUT_MS = 30000;

const requiredEnvironment = [
  'ENTRA_SYNC_TENANT_ID',
  'ENTRA_SYNC_CLIENT_ID',
  'ENTRA_SYNC_CLIENT_SECRET',
];

const getConfig = () => {
  const missing = requiredEnvironment.filter((name) => !String(process.env[name] || '').trim());
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }

  return {
    tenantId: process.env.ENTRA_SYNC_TENANT_ID.trim(),
    clientId: process.env.ENTRA_SYNC_CLIENT_ID.trim(),
    clientSecret: process.env.ENTRA_SYNC_CLIENT_SECRET,
  };
};

const requestWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const readJson = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (response.ok) return payload;

  const error = new Error(payload?.error?.message || `Microsoft Graph respondió con HTTP ${response.status}.`);
  error.status = response.status;
  error.code = payload?.error?.code || payload?.error || 'GRAPH_REQUEST_FAILED';
  error.requestId = response.headers.get('request-id') || payload?.error?.innerError?.['request-id'] || null;
  throw error;
};

const getApplicationToken = async (config) => {
  const response = await requestWithTimeout(
    `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        scope: GRAPH_SCOPE,
        grant_type: 'client_credentials',
      }),
    }
  );

  const payload = await readJson(response);
  if (!payload.access_token) throw new Error('La respuesta de autenticación no contiene access_token.');
  return payload.access_token;
};

const graphGet = async (path, accessToken) => {
  const response = await requestWithTimeout(`${GRAPH_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  return readJson(response);
};

const main = async () => {
  const config = getConfig();
  console.log('[ENTRA TEST] Solicitando token mediante client_credentials...');
  const accessToken = await getApplicationToken(config);
  console.log('[ENTRA TEST] Token obtenido correctamente.');

  console.log('[ENTRA TEST] Consultando /subscribedSkus...');
  const skuPayload = await graphGet(
    '/subscribedSkus?$select=skuId,skuPartNumber,capabilityStatus',
    accessToken
  );
  const skus = Array.isArray(skuPayload.value) ? skuPayload.value : [];
  console.log(`[ENTRA TEST] SKU detectados: ${skus.length}`);
  console.table(skus.map(({ skuId, skuPartNumber, capabilityStatus }) => ({
    skuId,
    skuPartNumber,
    capabilityStatus,
  })));

  console.log('[ENTRA TEST] Consultando los primeros 20 usuarios...');
  const userPayload = await graphGet(
    '/users?$select=id,displayName,givenName,surname,mail,department,assignedLicenses,accountEnabled&$top=20',
    accessToken
  );
  const users = Array.isArray(userPayload.value) ? userPayload.value : [];
  console.log(`[ENTRA TEST] Usuarios recibidos: ${users.length}`);
  console.table(users.map((user) => ({
    id: user.id,
    displayName: user.displayName || '',
    givenName: user.givenName || '',
    surname: user.surname || '',
    mail: user.mail || '',
    department: user.department || '',
    accountEnabled: user.accountEnabled,
    assignedSkuIds: (user.assignedLicenses || []).map(({ skuId }) => skuId).join(', '),
  })));

  console.log('[ENTRA TEST] Conectividad con Microsoft Graph validada correctamente.');
};

main().catch((error) => {
  console.error('[ENTRA TEST] Fallo de conectividad.', {
    name: error.name,
    code: error.code || null,
    status: error.status || null,
    requestId: error.requestId || null,
    message: error.message,
  });
  process.exitCode = 1;
});
