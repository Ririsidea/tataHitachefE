import axios, { type AxiosResponse } from 'axios';
import type {
  ApiError, ApiResult, CreateOrderPayload, DailyExport, DailyExportView, Employee, Order, Paged, ProductDetail,
  StockRow, User,
} from '../types';

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
const TUNNEL_HEADERS: Record<string, string> = /ngrok/i.test(API_BASE_URL) ? { 'ngrok-skip-browser-warning': 'true' } : {};

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

async function unwrap<T>(promise: Promise<AxiosResponse<T>>): Promise<T> {
  try {
    const { data } = await promise;
    return data;
  } catch (err) {
    const failure = err as { response?: { status?: number; data?: { requestId?: string; message?: string } }; message: string };
    const status = failure.response?.status;
    const requestId = failure.response?.data?.requestId;
    const message = failure.response?.data?.message || failure.message;
    // A 500 / 502 is not the user's mistake: show the support reference so the failure can be traced.
    const error: ApiError = new Error(requestId && status !== undefined && status >= 500 ? `${message} (Ref: ${requestId})` : message);
    // Callers can branch on the HTTP status (400 input, 401 sign-in / key, 404, 409 stock / state, 500, 502 Shopify down).
    error.status = status;
    error.requestId = requestId;
    throw error;
  }
}

export const login = (email: string, password: string) =>
  unwrap<ApiResult<{ token: string; user: User }>>(client.post('/auth/login', { email, password }));
export const resetPassword = (email: string, newPassword: string) =>
  unwrap<ApiResult<unknown>>(client.post('/auth/reset-password', { email, newPassword }));
export const getMe = () => unwrap<ApiResult<User>>(client.get('/auth/me'));

// ---- x-api-key routes (no JWT) -------------------------------------------------------
// One page (50) of an employee's orders, newest first: { data, meta }. `params`: employeeEmail (required,
// taken from the logged-in profile), page, status, fromDate, toDate.
export interface OrderParams {
  employeeEmail?: string;
  page?: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
}
export const getOrders = (params: OrderParams) =>
  unwrap<Paged<Order>>(keyClient.get('/dashboard/orders', { params }));
// Product list + search, always one page of 50 variant rows: { data, meta }. `params` are the
// query parameters (page, q, sku, category, color, size, inStock, minPrice, maxPrice, sort, order, fresh).
export type StockParams = Record<string, string | number | undefined>;
export const getStock = (params: StockParams) => unwrap<Paged<StockRow>>(keyClient.get('/map/stock', { params }));

// Rows for exactly these SKUs. The list is paged 50 at a time, so this follows the pages;
// SKUs go out in batches to keep the URL short.
const SKU_BATCH = 40;
export async function getStockBySkus(skus: (string | null | undefined)[]): Promise<StockRow[]> {
  const unique = [...new Set(skus.filter((sku): sku is string => Boolean(sku)))];
  const rows: StockRow[] = [];
  for (let i = 0; i < unique.length; i += SKU_BATCH) {
    const sku = unique.slice(i, i + SKU_BATCH).join(',');
    for (let page = 1, more = true; more; page += 1) {
      const res = await getStock({ sku, page });
      rows.push(...res.data);
      more = res.meta.hasNextPage;
    }
  }
  return rows;
}

// One product by product id, variant id, SKU or handle (see matchedBy / matchedVariantId in the reply).
export const getProductDetail = (key: string | number) =>
  unwrap<ApiResult<ProductDetail>>(keyClient.get(`/map/product/${encodeURIComponent(key)}`));
export const createMapOrder = (payload: CreateOrderPayload) =>
  unwrap<ApiResult<Order>>(keyClient.post('/map/create-order', payload));
export const getOrderStatus = (id: string | number) => unwrap<ApiResult<Order>>(keyClient.get(`/map/order-status/${id}`));
export const cancelOrder = (id: string | number) => unwrap<ApiResult<unknown>>(keyClient.post(`/map/orders/${id}/cancel`));

// ---- JWT routes ----------------------------------------------------------------------
export interface DailyExportResult {
  message?: string;
  downloadUrl?: string;
  file?: string;
}
export const exportDaily = () => unwrap<DailyExportResult>(client.post('/sap/export-daily'));

// Employee Orders page: one row per daily export, not per order.
// One page (50) of the signed-in employee's daily exports: { data, meta }. `params`: page, from, to (YYYY-MM-DD).
export const listDailyExports = (params: { page: number; from?: string; to?: string }) =>
  unwrap<Paged<DailyExport>>(client.get('/sap/daily-exports', { params }));
export const viewDailyExport = (id: string | number) =>
  unwrap<ApiResult<DailyExportView>>(client.get(`/sap/daily-exports/${id}/view`));
export const deleteDailyExport = (id: string | number) =>
  unwrap<ApiResult<unknown>>(client.delete(`/sap/daily-exports/${id}`));

// The download needs the same Authorization header as every other call, so it
// can't be a plain <a href> (the browser navigation has no way to attach it) -
// fetch it as a blob instead and trigger a save via a temporary object URL.
export async function downloadDailyExportFile(id: string | number, fileName?: string): Promise<void> {
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

// One page (50) of employees, newest first: { data, meta }. `params`: page, q (name or email).
export const listEmployees = (params: { page: number; q?: string }) =>
  unwrap<Paged<Employee>>(client.get('/admin/employees', { params }));
export const addEmployee = (payload: { name: string; email: string; password: string }) =>
  unwrap<ApiResult<Employee>>(client.post('/admin/employees', payload));
export const deleteEmployee = (id: string | number) => unwrap<ApiResult<unknown>>(client.delete(`/admin/employees/${id}`));

export default API_BASE_URL;
