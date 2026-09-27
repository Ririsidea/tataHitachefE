export function formatCurrency(value: number | string | null | undefined): string {
  return `₹${Number(value).toFixed(2)}`;
}

// Shopify status values are snake_case ("in_transit", "out_for_delivery"): show them as words.
export function formatStatusLabel(value: string | null | undefined): string {
  return String(value || '').replace(/_/g, ' ');
}
