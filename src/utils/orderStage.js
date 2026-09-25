// The order lifecycle the UI shows: Pending -> Paid -> Fulfilled (Fulfilled is final and locked),
// plus the delivery progress of the shipment (in transit -> out for delivery -> delivered).
// The stage is computed by the backend (src/utils/orderStatus.js#orderStage) and arrives on every
// order the API and the live event stream return, so both sides always agree; orderStage() below
// is only a fallback for an order object that lacks it. The backend enforces the lock and the
// action rules - these helpers only decide what the UI offers.

export const STAGE_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  partially_fulfilled: 'Partially fulfilled',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const STAGE_TONES = {
  pending: 'warning',
  paid: 'info',
  partially_fulfilled: 'warning',
  fulfilled: 'success',
  cancelled: 'danger',
  refunded: 'danger',
};

const lower = (value) => String(value || '').toLowerCase();

export function orderStage(order) {
  if (order.stage) return order.stage;
  const status = lower(order.status);
  const financial = lower(order.financialStatus);
  const fulfillment = lower(order.fulfillmentStatus);
  if (status === 'cancelled') return 'cancelled';
  if (status === 'refunded' || financial === 'refunded') return 'refunded';
  if (fulfillment === 'fulfilled') return 'fulfilled';
  if (fulfillment === 'partial') return 'partially_fulfilled';
  if (financial === 'paid') return 'paid';
  return 'pending';
}

// A fulfilled order is locked: no cancel, no edit, no status change.
export function isOrderLocked(order) {
  return order.locked ?? lower(order.fulfillmentStatus) === 'fulfilled';
}

// Admin actions, following the lifecycle order (mirrors src/services/orderStatus.service.js).
export function canMarkPaid(order) {
  return !isOrderLocked(order) && order.status === 'open' && orderStage(order) === 'pending';
}

export function canMarkFulfilled(order) {
  const stage = orderStage(order);
  const workable = order.status === 'open' || (order.status === 'fulfilled' && stage === 'partially_fulfilled');
  return !isOrderLocked(order) && workable && (stage === 'paid' || stage === 'partially_fulfilled');
}

// The fields a live event / action response may overwrite on an order row; line items and other
// detail stay as loaded.
const UPDATE_FIELDS = [
  'status',
  'financialStatus',
  'fulfillmentStatus',
  'deliveryStatus',
  'closedAt',
  'totalPrice',
  'trackingNumber',
  'trackingUrl',
  'carrier',
  'updatedAt',
  'stage',
  'locked',
  'canCancel',
  'canUpdate',
];

export function mergeOrderUpdate(order, update) {
  const next = { ...order };
  UPDATE_FIELDS.forEach((field) => {
    if (update[field] !== undefined) next[field] = update[field];
  });
  return next;
}
