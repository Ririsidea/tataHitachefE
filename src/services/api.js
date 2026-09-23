import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
export const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const TOKEN_STORAGE_KEY = 'tata_h_auth_token';

const client = axios.create({ baseURL: API_BASE_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 from the login endpoint itself just means "wrong credentials" - it should
    // surface as a form error, not trigger a forced logout/redirect.
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

async function unwrap(promise) {
  try {
    const { data } = await promise;
    return data;
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    throw new Error(message);
  }
}

export const login = (email, password) => unwrap(client.post('/auth/login', { email, password }));
export const resetPassword = (email, newPassword) =>
  unwrap(client.post('/auth/reset-password', { email, newPassword }));
export const getMe = () => unwrap(client.get('/auth/me'));

export const getEvents = (limit = 50) => unwrap(client.get(`/dashboard/events?limit=${limit}`));
export const getOrders = () => unwrap(client.get('/dashboard/orders'));
export const getProducts = () => unwrap(client.get('/dashboard/products'));
export const getStock = () => unwrap(client.get('/map/stock'));
export const getProductDetail = (id) => unwrap(client.get(`/map/product/${id}`));
export const createMapOrder = (payload) => unwrap(client.post('/map/create-order', payload));
export const getOrderStatus = (id) => unwrap(client.get(`/map/order-status/${id}`));
export const cancelOrder = (id) => unwrap(client.post(`/map/orders/${id}/cancel`));
export const exportDaily = () => unwrap(client.post('/sap/export-daily'));

// Employee Orders page: one row per daily export, not per order.
export const listDailyExports = ({ page = 1, pageSize = 10, from, to } = {}) => {
  const params = new URLSearchParams({ page, pageSize });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return unwrap(client.get(`/sap/daily-exports?${params.toString()}`));
};
export const viewDailyExport = (id) => unwrap(client.get(`/sap/daily-exports/${id}/view`));
export const deleteDailyExport = (id) => unwrap(client.delete(`/sap/daily-exports/${id}`));

// The download needs the same Authorization header as every other call, so it
// can't be a plain <a href> (the browser navigation has no way to attach it) -
// fetch it as a blob instead and trigger a save via a temporary object URL.
export async function downloadDailyExportFile(id, fileName) {
  const response = await client.get(`/sap/daily-exports/${id}/download`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `export-${id}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const listEmployees = () => unwrap(client.get('/admin/employees'));
export const addEmployee = (payload) => unwrap(client.post('/admin/employees', payload));
export const deleteEmployee = (id) => unwrap(client.delete(`/admin/employees/${id}`));

export default API_BASE_URL;
