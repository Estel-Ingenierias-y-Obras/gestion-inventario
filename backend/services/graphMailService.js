const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
let tokenCache = null;

const getGraphConfig = () => {
  const required = ['GRAPH_TENANT_ID', 'GRAPH_CLIENT_ID', 'GRAPH_CLIENT_SECRET', 'GRAPH_SENDER'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Configuración de Microsoft Graph incompleta: ${missing.join(', ')}`);

  return {
    tenantId: process.env.GRAPH_TENANT_ID.trim(),
    clientId: process.env.GRAPH_CLIENT_ID.trim(),
    clientSecret: process.env.GRAPH_CLIENT_SECRET,
    sender: process.env.GRAPH_SENDER.trim().toLowerCase(),
  };
};

const requestWithTimeout = async (url, options, milliseconds = 30000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), milliseconds);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const getApplicationToken = async () => {
  if (tokenCache?.expiresAt > Date.now() + 60000) return tokenCache.accessToken;

  const config = getGraphConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: GRAPH_SCOPE,
    grant_type: 'client_credentials',
  });
  const response = await requestWithTimeout(
    `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body },
    20000
  );
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    console.error('[GRAPH AUTH]', { status: response.status, code: payload.error || 'TOKEN_REQUEST_FAILED' });
    const error = new Error('No se pudo obtener el token de aplicación para Microsoft Graph.');
    error.statusCode = 502;
    error.graphStatus = response.status;
    error.graphCode = payload.error || 'TOKEN_REQUEST_FAILED';
    throw error;
  }

  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (Number(payload.expires_in || 3600) * 1000),
  };
  return tokenCache.accessToken;
};

const sendGraphMail = async ({ to, subject, html, idempotencyKey = '' }) => {
  const config = getGraphConfig();
  const accessToken = await getApplicationToken();
  const message = {
    subject,
    body: { contentType: 'HTML', content: html },
    toRecipients: [{ emailAddress: { address: to } }],
  };
  if (idempotencyKey) {
    message.internetMessageHeaders = [{ name: 'x-inventory-report-id', value: idempotencyKey }];
  }

  const response = await requestWithTimeout(
    `${GRAPH_BASE_URL}/users/${encodeURIComponent(config.sender)}/sendMail`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, saveToSentItems: true }),
    }
  );

  if (response.status !== 202) {
    const payload = await response.json().catch(() => ({}));
    console.error('[GRAPH SEND]', { status: response.status, code: payload?.error?.code || 'SEND_MAIL_FAILED' });
    const error = new Error('Microsoft Graph rechazó el envío del correo.');
    error.statusCode = 502;
    error.graphStatus = response.status;
    error.graphCode = payload?.error?.code || 'SEND_MAIL_FAILED';
    throw error;
  }

  return { accepted: true, provider: 'microsoft-graph', sender: config.sender };
};

const testGraphMail = async () => {
  const accessToken = await getApplicationToken();
  const tokenPayload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'));
  const delivery = await sendGraphMail({
    to: 'javier.costa@esteling.com',
    subject: 'Prueba Microsoft Graph - Gestión de Inventario',
    html: '<p>Microsoft Graph está configurado correctamente en <strong>Gestión de Inventario</strong>.</p>',
    idempotencyKey: `graph-test:${Date.now()}`,
  });

  return {
    token: {
      audience: tokenPayload.aud || '',
      tenantId: tokenPayload.tid || '',
      applicationId: tokenPayload.appid || tokenPayload.azp || '',
      roles: tokenPayload.roles || [],
    },
    delivery: { ...delivery, to: 'javier.costa@esteling.com' },
  };
};

module.exports = { getApplicationToken, sendGraphMail, testGraphMail };
