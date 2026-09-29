// Shapes of the data the MAP backend returns and the UI passes around.
import type { ReactNode } from 'react';

export type Tone = 'info' | 'success' | 'warning' | 'danger';

export interface User {
  id: number | string;
  name?: string | null;
  email: string;
  employeeId?: string;
  phone?: string | null;
  isAdmin?: boolean;
}

/** Cursor pagination block of every list endpoint: { success, data: [...], pageInfo }.
 *  `offset` is the 0-based index of the first row in `data`, for a "Showing X-Y of Z" line. */
export interface PageInfo {
  limit: number;
  offset: number;
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
  filters?: Record<string, unknown>;
}

export interface Paged<T> {
  data: T[];
  pageInfo: PageInfo;
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
  // The Shopify order id: the order number shown to users and the id every order API takes.
  shopifyOrderId?: string | number | null;
  // The employee the order was placed for.
  name?: string | null;
  email?: string | null;
  phone?: string | null;
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
  employeeId: string;
  phone?: string | null;
  isAdmin?: boolean;
}

/** GET /api/map/pincode/:pin - the state, district and valid city names for that PIN. */
export interface PincodeInfo {
  pincode: string;
  state: string;
  district: string;
  cities: string[];
}

export interface ShippingAddress {
  address1: string;
  city: string;
  province: string;
  zip: string;
  country: string;
}

export interface CreateOrderPayload {
  name?: string | null;
  email?: string;
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
  // Cursor pagination is handled separately - see lib/cursor.ts and hooks/useCatalog.ts - so it
  // is never part of this object.
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
