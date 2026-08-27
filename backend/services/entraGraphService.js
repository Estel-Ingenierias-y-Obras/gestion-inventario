const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';
const DEFAULT_GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
let tokenCache = null;
let tokenRequest = null;

const getConfig = () => {
  const required = ['ENTRA_SYNC_TENANT_ID', 'ENTRA_SYNC_CLIENT_ID', 'ENTRA_SYNC_CLIENT_SECRET'];
  const missing = required.filter((name) => !String(process.env[name] || '').trim());
  if (missing.length) throw new Error(`Configuración Entra incompleta: ${missing.join(', ')}`);
  return {
    tenantId: process.env.ENTRA_SYNC_TENANT_ID.trim(),
    clientId: process.env.ENTRA_SYNC_CLIENT_ID.trim(),
    clientSecret: process.env.ENTRA_SYNC_CLIENT_SECRET,
    graphBaseUrl: String(process.env.ENTRA_GRAPH_BASE_URL || DEFAULT_GRAPH_BASE_URL).replace(/\/$/, ''),
  };
};

const requestWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
};

const parseResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (response.ok) return payload;
  const error = new Error(payload?.error?.message || `Microsoft Graph respondió con HTTP ${response.status}.`);
  error.statusCode = response.status === 401 || response.status === 403 ? 502 : response.status;
  error.graphStatus = response.status;
  error.graphCode = payload?.error?.code || payload?.error || 'GRAPH_REQUEST_FAILED';
  error.graphRequestId = response.headers.get('request-id') || payload?.error?.innerError?.['request-id'] || null;
  error.retryAfter = Number(response.headers.get('retry-after')) || null;
  throw error;
};

const getApplicationToken = async () => {
  if (tokenCache?.expiresAt > Date.now() + 60000) return tokenCache.accessToken;
  if (tokenRequest) return tokenRequest;
  tokenRequest = (async () => {
    const config = getConfig();
    const response = await requestWithTimeout(
      `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`,
      {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.clientId, client_secret: config.clientSecret,
          scope: GRAPH_SCOPE, grant_type: 'client_credentials',
        }),
      }
    );
    const payload = await parseResponse(response);
    tokenCache = {
      accessToken: payload.access_token,
      expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
    };
    return tokenCache.accessToken;
  })();
  try { return await tokenRequest; } finally { tokenRequest = null; }
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const graphGet = async (pathOrUrl) => {
  const config = getConfig();
  const url = pathOrUrl.startsWith('https://') ? pathOrUrl : `${config.graphBaseUrl}${pathOrUrl}`;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const accessToken = await getApplicationToken();
      const response = await requestWithTimeout(url, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      });
      return await parseResponse(response);
    } catch (error) {
      if (![429, 503, 504].includes(error.graphStatus) || attempt === MAX_RETRIES) throw error;
      await wait((error.retryAfter || 2 ** attempt) * 1000);
    }
  }
  throw new Error('Microsoft Graph no respondió después de los reintentos.');
};

const listSubscribedSkus = async () => {
  const payload = await graphGet('/subscribedSkus?$select=skuId,skuPartNumber,capabilityStatus');
  return Array.isArray(payload.value) ? payload.value : [];
};

const listAllUsers = async () => {
  const select = 'id,displayName,givenName,surname,mail,userPrincipalName,department,country,assignedLicenses,accountEnabled,userType';
  let nextLink = `/users?$select=${select}&$top=999`;
  const users = [];
  while (nextLink) {
    const payload = await graphGet(nextLink);
    users.push(...(Array.isArray(payload.value) ? payload.value : []));
    nextLink = payload['@odata.nextLink'] || null;
  }
  return users;
};

module.exports = { getApplicationToken, listSubscribedSkus, listAllUsers };
