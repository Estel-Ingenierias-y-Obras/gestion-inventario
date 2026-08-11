import { PublicClientApplication } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_CLIENT_ID;
const tenantId = import.meta.env.VITE_TENANT_ID;
const redirectUri = import.meta.env.VITE_REDIRECT_URI || window.location.origin;
const authority = `https://login.microsoftonline.com/${tenantId}`;

if (!clientId || !tenantId) {
  console.warn('[MSAL] Missing VITE_CLIENT_ID or VITE_TENANT_ID. Auth will not work until these are configured.');
}

const msalConfig = {
  auth: {
    clientId,
    authority,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest = {
  scopes: ['openid', 'profile', 'User.Read'],
};
