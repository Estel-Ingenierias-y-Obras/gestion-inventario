const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const tenantId = process.env.AZURE_TENANT_ID;
const audience = process.env.AZURE_AUDIENCE || process.env.AZURE_CLIENT_ID;
const v1Issuer = tenantId ? `https://sts.windows.net/${tenantId}/` : null;
const v2Issuer = tenantId ? `https://login.microsoftonline.com/${tenantId}/v2.0` : null;
const authDebug = process.env.AUTH_DEBUG === 'true';

if (!tenantId || !audience) {
  console.warn('[AUTH] AZURE_TENANT_ID and AZURE_CLIENT_ID/AUDIENCE should be configured for Entra ID validation.');
}

const v1Client = jwksClient({
  jwksUri: tenantId
    ? `https://login.microsoftonline.com/${tenantId}/discovery/keys`
    : 'https://login.microsoftonline.com/common/discovery/keys',
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000,
});

const v2Client = jwksClient({
  jwksUri: tenantId
    ? `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
    : 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000,
});

const getBearerToken = (req) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
};

const getSigningKey = async (kid, tokenVersion) => {
  const client = tokenVersion === '1.0' ? v1Client : v2Client;

  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(key.publicKey || key.rsaPublicKey);
    });
  });
};

const extractUserInfo = (claims) => ({
  name: claims.name || claims.preferred_username || claims.email || claims.upn || claims.unique_name || 'Usuario autenticado',
  email: claims.preferred_username || claims.email || claims.upn || claims.unique_name || '',
  tenantId: claims.tid || claims.tenantId || '',
  oid: claims.oid || '',
});

const logJwtDiagnostic = (decoded) => {
  console.log('JWT AUD', decoded?.aud);
  console.log('JWT ISS', decoded?.iss);
  console.log('JWT TID', decoded?.tid);
  console.log('JWT SCP', decoded?.scp);
  console.log('CONFIG AUD', audience);
  console.log('CONFIG TENANT', tenantId);
};

const authenticate = async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No se proporcionó un token de autorización.',
    });
  }

  const decoded = jwt.decode(token);

  if (!tenantId || !audience) {
    logJwtDiagnostic(decoded);
    return res.status(403).json({
      success: false,
      message: 'La configuración de autenticación de Microsoft Entra ID no está disponible para validar el token.',
    });
  }

  try {
    const decodedHeader = jwt.decode(token, { complete: true });
    const kid = decodedHeader?.header?.kid;
    const tokenVersion = String(decoded?.ver || '2.0');
    const expectedIssuer = tokenVersion === '1.0' ? v1Issuer : v2Issuer;

    if (!kid) {
      logJwtDiagnostic(decoded);
      return res.status(403).json({
        success: false,
        message: 'El token no contiene un identificador de firma válido.',
      });
    }

    const signingKey = await getSigningKey(kid, tokenVersion);

    const verifiedClaims = await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        signingKey,
        {
          algorithms: ['RS256'],
          audience,
          issuer: expectedIssuer,
        },
        (error, decoded) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(decoded);
        }
      );
    });

    if (authDebug) {
      console.info('[AUTH] Claims JWT verificados', {
        aud: verifiedClaims.aud,
        scp: verifiedClaims.scp,
        oid: verifiedClaims.oid,
        name: verifiedClaims.name,
      });
    }

    if (verifiedClaims.tid !== tenantId) {
      logJwtDiagnostic(decoded);
      return res.status(403).json({
        success: false,
        message: 'El token pertenece a un tenant no autorizado.',
      });
    }

    const scopes = String(verifiedClaims.scp || '').split(' ').filter(Boolean);
    if (!scopes.includes('access_as_user')) {
      logJwtDiagnostic(decoded);
      return res.status(403).json({
        success: false,
        message: 'El token no contiene el permiso access_as_user.',
      });
    }

    req.user = extractUserInfo(verifiedClaims);
    return next();
  } catch (error) {
    logJwtDiagnostic(decoded);
    console.error('JWT VALIDATION ERROR', error);
    return res.status(403).json({
      success: false,
      message: 'El token no es válido o ha expirado.',
    });
  }
};

module.exports = authenticate;
