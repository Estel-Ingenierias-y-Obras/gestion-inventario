import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getEntregas = () => api.get('/api/entregas');
export const createEntrega = (payload) => api.post('/api/entregas', payload);

export default api;
