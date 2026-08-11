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

  const tokenResponse = await msalInstance.acquireTokenSilent({
    ...apiRequest,
    account,
  });

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

export const getEntregas = ({ page = 1, limit = 20 } = {}) => (
  api.get('/api/entregas', { params: { page, limit } })
);
export const getEntregaStats = () => api.get('/api/entregas/stats');
export const createEntrega = (payload) => api.post('/api/entregas', payload);

export default api;
