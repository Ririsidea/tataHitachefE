import { useEffect } from 'react';
import Badge, { toneForStatus } from './Badge';
import { formatCurrency } from '../utils/formatters';

export default function OrderDetailsModal({ order, productsBySku, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!order) return null;

  const lineItems = order.lineItems || [];
  const total =
    order.totalPrice ?? lineItems.reduce((sum, li) => sum + (Number(li.price) || 0) * li.quantity, 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel order-details-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="order-details-body">
          <h2>Order Details</h2>

          <div className="order-summary">
            <div className="order-summary-row">
              <span>Shopify Order ID</span>
              <span>{order.shopifyOrderId || '—'}</span>
            </div>
            <div className="order-summary-row">
              <span>Status</span>
              <Badge tone={toneForStatus(order.status)}>{order.status}</Badge>
            </div>
            {order.financialStatus && (
              <div className="order-summary-row">
                <span>Financial Status</span>
                <Badge tone={toneForStatus(order.financialStatus)}>{order.financialStatus}</Badge>
              </div>
            )}
            {order.fulfillmentStatus && (
              <div className="order-summary-row">
                <span>Fulfillment Status</span>
                <Badge tone={toneForStatus(order.fulfillmentStatus)}>{order.fulfillmentStatus}</Badge>
              </div>
            )}
            {order.trackingNumber && (
              <div className="order-summary-row">
                <span>Tracking Number</span>
                <span>{order.trackingUrl ? <a href={order.trackingUrl} target="_blank" rel="noreferrer">{order.trackingNumber}</a> : order.trackingNumber}</span>
              </div>
            )}
            {order.carrier && (
              <div className="order-summary-row">
                <span>Carrier</span>
                <span>{order.carrier}</span>
              </div>
            )}
          </div>

          <div className="order-summary">
            <h3>Items ({lineItems.length})</h3>
            {lineItems.map((li) => {
              const product = productsBySku[li.sku];
              return (
                <div className="product-row" key={li.id}>
                  <div className="product-row-thumb">
                    {product?.imageUrl ? (
                      <img src={product.imageUrl} alt={li.title} />
                    ) : (
                      <div className="product-row-thumb-placeholder">No image</div>
                    )}
                  </div>
                  <div className="product-row-info">
                    <span className="product-row-title">{li.title}</span>
                    <span className="product-row-sku">
                      {li.sku || 'No SKU'} · Qty {li.quantity}
                    </span>
                  </div>
                  <div className="product-row-price">{formatCurrency((li.price || 0) * li.quantity)}</div>
                </div>
              );
            })}
            <div className="order-summary-total">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
