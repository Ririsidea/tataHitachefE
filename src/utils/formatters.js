export function summarize(topic, payload) {
  if (!payload) return '';
  switch (topic) {
    case 'orders/create':
    case 'orders/updated':
      return `Order #${payload.order_number || payload.id} — ${payload.financial_status || 'pending'}`;
    case 'orders/cancelled':
      return `Order #${payload.order_number || payload.id} cancelled`;
    case 'orders/paid':
      return `Order #${payload.order_number || payload.id} marked paid`;
    case 'orders/fulfilled':
      return `Order #${payload.order_number || payload.id} fulfilled`;
    case 'products/create':
    case 'products/update':
      return `Product: ${payload.title}`;
    case 'inventory_levels/update':
      return `Item ${payload.inventory_item_id} → ${payload.available} available`;
    case 'fulfillments/create':
    case 'fulfillments/update':
      return `Tracking: ${payload.tracking_number || 'n/a'} (${payload.tracking_company || 'carrier n/a'})`;
    case 'refunds/create':
      return `Refund on order ${payload.order_id}`;
    default:
      return JSON.stringify(payload).slice(0, 120);
  }
}

export function formatCurrency(value) {
  return `₹${Number(value).toFixed(2)}`;
}
