const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const tenantId = process.env.AZURE_TENANT_ID;
const audience = process.env.AZURE_AUDIENCE || process.env.AZURE_CLIENT_ID;
const issuer = tenantId ? `https://login.microsoftonline.com/${tenantId}/v2.0` : null;

if (!tenantId || !audience) {
  console.warn('[AUTH] AZURE_TENANT_ID and AZURE_CLIENT_ID/AUDIENCE should be configured for Entra ID validation.');
}

const client = jwksClient({
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

const getSigningKey = async (kid) => {
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
  name: claims.name || claims.preferred_username || claims.email || 'Usuario autenticado',
  email: claims.preferred_username || claims.email || '',
  tenantId: claims.tid || claims.tenantId || '',
  oid: claims.oid || '',
});

const authenticate = async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No se proporcionó un token de autorización.',
    });
  }

  if (!tenantId || !audience) {
    return res.status(500).json({
      success: false,
      message: 'La configuración de autenticación de Microsoft Entra ID no está completa.',
    });
  }

  try {
    const decodedHeader = jwt.decode(token, { complete: true });
    const kid = decodedHeader?.header?.kid;

    if (!kid) {
      return res.status(403).json({
        success: false,
        message: 'El token no contiene un identificador de firma válido.',
      });
    }

    const signingKey = await getSigningKey(kid);

    const verifiedClaims = await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        signingKey,
        {
          algorithms: ['RS256'],
          audience,
          issuer,
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

    req.user = extractUserInfo(verifiedClaims);
    return next();
  } catch (error) {
    console.error('JWT validation error:', error.message);
    return res.status(403).json({
      success: false,
      message: 'El token no es válido o ha expirado.',
    });
  }
};

module.exports = authenticate;
