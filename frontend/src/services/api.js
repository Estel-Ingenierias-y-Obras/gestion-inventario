import axios from 'axios';
import { apiRequest, msalInstance } from '../auth/msalConfig';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];

  if (!account) {
    throw new Error('No hay una cuenta autenticada disponible.');
  }

  if (apiRequest.scopes.length === 0) {
    throw new Error('VITE_API_SCOPE no está configurado.');
  }

  let tokenResponse;

  try {
    console.log('[MSAL] acquireTokenSilent start', {
      route: window.location.pathname,
      scopes: apiRequest.scopes,
      account: account.username,
    });
    tokenResponse = await msalInstance.acquireTokenSilent({
      ...apiRequest,
      account,
    });
    console.log('[MSAL] acquireTokenSilent result', {
      account: tokenResponse.account?.username || null,
      scopes: tokenResponse.scopes || [],
      fromCache: tokenResponse.fromCache,
    });
  } catch (tokenError) {
    console.error('[MSAL] acquireTokenSilent error', {
      name: tokenError?.name,
      errorCode: tokenError?.errorCode,
      subError: tokenError?.subError,
      message: tokenError?.message,
      stack: tokenError?.stack,
    });
    throw tokenError;
  }

  if (import.meta.env.VITE_AUTH_DEBUG === 'true') {
    console.info('[AUTH] Access token obtenido', {
      obtenido: Boolean(tokenResponse.accessToken),
      longitud: tokenResponse.accessToken?.length || 0,
      scopes: tokenResponse.scopes || [],
    });
  }

  config.headers.Authorization = `Bearer ${tokenResponse.accessToken}`;
  return config;
});

export const getEntregas = ({ page = 1, limit = 20, period = 'all', search = '' } = {}) => (
  api.get('/api/entregas', { params: { page, limit, period, search } })
);
export const getEntregaStats = () => api.get('/api/entregas/stats');
export const createEntrega = (payload) => api.post('/api/entregas', payload);
export const deleteEntrega = (id) => api.delete(`/api/entregas/${id}`);
export const getAccessStatus = () => api.get('/api/whitelist/access');
export const getWhitelistUsers = () => api.get('/api/whitelist');
export const addWhitelistUser = (payload) => api.post('/api/whitelist', payload);
export const deleteWhitelistUser = (id) => api.delete(`/api/whitelist/${id}`);
export const getEmailSchedules = () => api.get('/api/email-schedules');
export const addEmailSchedule = (payload) => api.post('/api/email-schedules', payload);
export const deleteEmailSchedule = (id) => api.delete(`/api/email-schedules/${id}`);
export const sendEmailSchedule = (id) => api.post(`/api/email-schedules/${id}/send?force=true`);

export default api;
