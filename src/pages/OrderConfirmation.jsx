import { useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';

export default function OrderConfirmation({ order, onBackToShop }) {
  useEffect(() => {
    if (!order) onBackToShop();
  }, [order, onBackToShop]);

  if (!order) return null;

  const lineItems = order.lineItems || [];
  const total =
    order.totalPrice ?? lineItems.reduce((sum, li) => sum + (Number(li.price) || 0) * li.quantity, 0);

  return (
    <div className="panel">
      <div className="confirmation-banner">
        <h2>✓ Order Placed Successfully</h2>
        <p className="hint">Your order has been created in Shopify and recorded in the MAP bridge.</p>
      </div>
      <div className="order-summary">
        <div className="order-summary-row">
          <span>Shopify Order ID</span>
          <span>{order.shopifyOrderId || '—'}</span>
        </div>
      </div>
      <div className="order-summary">
        <h3>Items</h3>
        {lineItems.map((li, idx) => (
          <div className="order-summary-row" key={li.id || idx}>
            <span>
              {li.title} × {li.quantity}
            </span>
            <span>{formatCurrency((li.price || 0) * li.quantity)}</span>
          </div>
        ))}
        <div className="order-summary-total">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
      <button type="button" className="btn-primary" onClick={onBackToShop}>
        Back to Shop
      </button>
    </div>
  );
}
