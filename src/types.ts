// Shapes of the data the MAP backend returns and the UI passes around.
import type { ReactNode } from 'react';

export type Tone = 'info' | 'success' | 'warning' | 'danger';

export interface User {
  id: number | string;
  name?: string | null;
  email: string;
  phone?: string | null;
  isAdmin?: boolean;
}

/** Pagination block of every list endpoint: { success, data: [...], meta }. */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  filters?: Record<string, unknown>;
  facets?: { categories?: string[] };
}

export interface Paged<T> {
  data: T[];
  meta: PageMeta;
}

/** One variant row of GET /api/map/stock. */
export interface StockRow {
  variantId: string | number;
  sku: string | null;
  title: string;
  variantTitle?: string | null;
  category?: string | null;
  price: number | string;
  compareAtPrice?: number | string | null;
  availableQty: number;
  imageUrl?: string | null;
  options?: Record<string, string>;
}

export interface ProductVariant {
  variantId: string | number;
  sku: string | null;
  variantTitle?: string | null;
  price: number | string;
  compareAtPrice?: number | string | null;
  availableQty: number;
}

/** GET /api/map/product/:key. */
export interface ProductDetail {
  title: string;
  category?: string | null;
  description?: string | null;
  tags?: string[];
  images?: string[];
  variants: ProductVariant[];
  matchedVariantId?: string | number | null;
}

export interface CartItem {
  sku: string;
  title: string;
  variantTitle: string | null;
  price: number | string;
  imageUrl?: string | null;
  availableQty: number;
  quantity: number;
}

/** What addItem needs from a product / variant. */
export interface CartProduct {
  sku: string;
  title: string;
  variantTitle?: string | null;
  price: number | string;
  imageUrl?: string | null;
  availableQty: number;
}

export interface OrderLineItem {
  id?: string | number;
  sku?: string | null;
  title: string;
  quantity: number;
  price?: number | string | null;
}

export type OrderStage =
  | 'pending'
  | 'paid'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'cancelled'
  | 'refunded';

export interface Order {
  id: number | string;
  shopifyOrderId?: string | number | null;
  status?: string;
  financialStatus?: string | null;
  fulfillmentStatus?: string | null;
  deliveryStatus?: string | null;
  closedAt?: string | null;
  totalPrice?: number | string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrier?: string | null;
  createdAt?: string;
  updatedAt?: string;
  stage?: OrderStage;
  locked?: boolean;
  canCancel?: boolean;
  lineItems?: OrderLineItem[];
}

export interface DailyExport {
  id: number | string;
  fileName?: string;
  exportDate?: string;
  orderCount: number;
  createdAt?: string;
}

export interface DailyExportView {
  exportDate?: string;
  orderCount: number;
  columns: string[];
  rows: (string | number | null)[][];
}

export interface Employee {
  id: number | string;
  name?: string | null;
  email: string;
  isAdmin?: boolean;
}

export interface ShippingAddress {
  address1: string;
  city: string;
  province: string;
  zip: string;
  country: string;
}

export interface CreateOrderPayload {
  employeeName?: string | null;
  employeeEmail?: string;
  phone: string;
  items: { sku: string; quantity: number }[];
  shippingAddress: ShippingAddress;
}

/** Every response is unwrapped to the body: { success, data, ... }. */
export interface ApiResult<T> {
  success?: boolean;
  data: T;
  message?: string;
}

/** Error thrown by the api client: message from the server plus the HTTP status / support reference. */
export interface ApiError extends Error {
  status?: number;
  requestId?: string;
}

export interface CatalogParams {
  page: number;
  q: string;
  category: string;
  color: string;
  size: string;
  inStock: string; // '' | 'true' | 'false'
  minPrice: string;
  maxPrice: string;
  sort: string;
  order: string;
}

export interface DataColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}
