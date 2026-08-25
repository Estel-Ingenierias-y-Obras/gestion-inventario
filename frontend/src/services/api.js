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

  config.headers.Authorization = `Bearer ${tokenResponse.accessToken}`;
  return config;
});

export const getEntregas = ({ page = 1, limit = 20, period = 'all', search = '', sortBy, sortDirection } = {}) => (
  api.get('/api/entregas', { params: { page, limit, period, search, sortBy, sortDirection } })
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
export const updateEmailSchedule = (id, payload) => api.put(`/api/email-schedules/${id}`, payload);
export const deleteEmailSchedule = (id) => api.delete(`/api/email-schedules/${id}`);
export const sendEmailSchedule = (id) => api.post(`/api/email-schedules/${id}/send?force=true`);
export const getMaterialOrders = () => api.get('/api/material-orders');
export const getStockCatalog = () => api.get('/api/material-orders/catalog');
export const getMaterialOrderHistory = () => api.get('/api/material-orders/history');
export const createMaterialOrder = (payload) => api.post('/api/material-orders', payload);
export const updateMaterialOrder = (id, payload) => api.put(`/api/material-orders/${id}`, payload);
export const restoreMaterialOrder = (id, cantidad) => api.patch(`/api/material-orders/${id}/restore`, { cantidad });
export const deleteMaterialOrder = (id) => api.delete(`/api/material-orders/${id}`);
export const getDepartments = () => api.get('/api/departments');
export const createDepartment = (payload) => api.post('/api/departments', payload);
export const deleteDepartment = (id) => api.delete(`/api/departments/${id}`);
export const getDepartment = (id) => api.get(`/api/departments/${id}`);
export const getDepartmentPeople = (departmentId) => api.get(`/api/departments/${departmentId}/people`);
export const getPeopleCatalog = () => api.get('/api/people/catalog');
export const createPerson = (departmentId, payload) => api.post(`/api/departments/${departmentId}/people`, payload);
export const updatePerson = (personId, payload) => api.put(`/api/people/${personId}`, payload);
export const deletePerson = (personId) => api.delete(`/api/people/${personId}`);
export const getPersonMaterials = (personId) => api.get(`/api/people/${personId}/materials`);
export const assignPersonMaterial = (personId, payload) => api.post(`/api/people/${personId}/materials`, payload);
export const updatePersonMaterialSerial = (personId, assignmentId, numeroSerie) => (
  api.patch(`/api/people/${personId}/materials/${assignmentId}/serial`, { numeroSerie })
);
export const removePersonMaterial = (personId, assignmentId) => api.delete(`/api/people/${personId}/materials/${assignmentId}`);

export default api;
