import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
export const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const TOKEN_STORAGE_KEY = 'tata_h_auth_token';

// Two clients, two credentials:
//   client    - employee JWT (Authorization: Bearer): login, /auth/me, admin, SAP.
//   keyClient - the static MAP API key (x-api-key): every Shopify-related route (stock,
//               product, orders, create/cancel/update). It never sends the JWT.
// ngrok's free tier answers browser requests with an HTML warning page (which has no CORS
// headers, so it surfaces as a CORS error) unless this header is present. The backend's CORS
// config already allows it; it is only sent when the API is actually served through ngrok.
const TUNNEL_HEADERS = /ngrok/i.test(API_BASE_URL) ? { 'ngrok-skip-browser-warning': 'true' } : {};

const client = axios.create({ baseURL: API_BASE_URL, headers: TUNNEL_HEADERS });

// The MAP API key comes from VITE_MAP_API_KEY in the frontend .env (Vite only exposes
// VITE_-prefixed variables to browser code). It is compiled into the bundle.
const MAP_API_KEY = import.meta.env.VITE_MAP_API_KEY;
export const MAP_API_KEY_MISSING = !MAP_API_KEY;
export const MAP_API_KEY_MISSING_MESSAGE =
  'VITE_MAP_API_KEY is not set in the frontend .env - add it (same value as MAP_API_KEY in the backend .env) and restart "npm run dev".';
if (MAP_API_KEY_MISSING) {
  console.error(MAP_API_KEY_MISSING_MESSAGE);
}
const keyClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { ...TUNNEL_HEADERS, ...(MAP_API_KEY ? { 'x-api-key': MAP_API_KEY } : {}) },
});

// No key configured: fail fast with a clear message instead of a silent 401 round-trip.
if (MAP_API_KEY_MISSING) {
  keyClient.interceptors.request.use(() => Promise.reject(new Error(MAP_API_KEY_MISSING_MESSAGE)));
}
// A 401 here means the key is wrong (or missing on the server) - it must NOT log the user out.
keyClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.response.data) {
      error.response.data.message = 'API key missing or invalid - check VITE_MAP_API_KEY in the frontend .env.';
    }
    return Promise.reject(error);
  }
);

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
    const error = new Error(message);
    // Callers can branch on the HTTP status (e.g. 409 stock/fulfilled, 401 bad key, 502 Shopify).
    error.status = err.response?.status;
    throw error;
  }
}

export const login = (email, password) => unwrap(client.post('/auth/login', { email, password }));
export const resetPassword = (email, newPassword) =>
  unwrap(client.post('/auth/reset-password', { email, newPassword }));
export const getMe = () => unwrap(client.get('/auth/me'));

// ---- x-api-key routes (no JWT) -------------------------------------------------------
// The orders list is scoped by the employee's email, taken from the logged-in profile.
export const getOrders = (employeeEmail) =>
  unwrap(keyClient.get('/dashboard/orders', { params: { employeeEmail } }));
export const getProducts = () => unwrap(keyClient.get('/dashboard/products'));
export const getStock = () => unwrap(keyClient.get('/map/stock'));
export const getProductDetail = (id) => unwrap(keyClient.get(`/map/product/${id}`));
export const createMapOrder = (payload) => unwrap(keyClient.post('/map/create-order', payload));
export const getOrderStatus = (id) => unwrap(keyClient.get(`/map/order-status/${id}`));
export const cancelOrder = (id) => unwrap(keyClient.post(`/map/orders/${id}/cancel`));
export const updateOrder = (id, payload) => unwrap(keyClient.put(`/orders/${id}`, payload));
// Live order for the Edit Order modal (address, contact, per-line unfulfilled quantity).
export const getMapOrder = (id) => unwrap(keyClient.get(`/map/orders/${id}`));
// Edit the order in Shopify. Resolves for 200 AND 207 (partial: check res.partial).
export const editMapOrder = (id, payload) => unwrap(keyClient.put(`/map/orders/${id}`, payload));

// ---- JWT routes ----------------------------------------------------------------------
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
