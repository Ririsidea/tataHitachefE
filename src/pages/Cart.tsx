import { useCart } from '../context/CartContext';
import QuantityStepper from '../components/QuantityStepper';
import AsyncState from '../components/AsyncState';
import { CloseIcon } from '../components/Icons';
import { formatCurrency } from '../utils/formatters';

export default function Cart({ onContinueShopping, onCheckout }: { onContinueShopping: () => void; onCheckout: () => void }) {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="panel">
        <h2>Your Cart</h2>
        <AsyncState loading={false} error={null} isEmpty emptyLabel="Your cart is empty." />
        <div className="cart-actions">
          <button type="button" className="btn-primary" onClick={onContinueShopping}>
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Your Cart</h2>
      <div className="cart-panel">
        <div className="cart-row cart-header">
          <span>Product</span>
          <span>Unit Price</span>
          <span>Qty</span>
          <span>Subtotal</span>
          <span />
        </div>
        {items.map((item) => (
          <div className="cart-row" key={item.sku}>
            <span className="cart-product-cell">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.title} className="cart-thumb" loading="lazy" decoding="async" />
              ) : (
                <span className="cart-thumb cart-thumb-placeholder" aria-hidden="true" />
              )}
              <span className="cart-product-title">
                {item.title}
                {item.variantTitle && <span className="cart-variant">{item.variantTitle}</span>}
              </span>
            </span>
            <span className="cart-price">{formatCurrency(item.price)}</span>
            <span className="cart-qty">
              <QuantityStepper
                value={item.quantity}
                min={1}
                max={item.availableQty}
                onChange={(q: number) => updateQuantity(item.sku, q)}
              />
            </span>
            <span className="cart-subtotal">{formatCurrency(Number(item.price || 0) * item.quantity)}</span>
            <button
              type="button"
              className="cart-remove-btn"
              onClick={() => removeItem(item.sku)}
              aria-label={`Remove ${item.title}`}
              title="Remove"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        ))}
        <div className="cart-total">
          <span>Total</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
      </div>
      <div className="cart-actions">
        <button type="button" className="btn-ghost" onClick={onContinueShopping}>
          Continue Shopping
        </button>
        <button type="button" className="btn-primary" onClick={onCheckout}>
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}
