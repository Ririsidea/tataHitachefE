import { useState } from 'react';
import { useCart } from '../context/CartContext';
import QuantityStepper from './QuantityStepper';
import Badge from './Badge';
import { CheckIcon } from './Icons';
import { formatCurrency } from '../utils/formatters';

function CartPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 2-1.6L21 8H6.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="20.5" r="1.4" fill="currentColor" />
      <circle cx="17.5" cy="20.5" r="1.4" fill="currentColor" />
      <path d="M15 8.5h4M17 6.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function ProductRow({ product, onQuickView }) {
  const { items, addItem } = useCart();
  const [qty, setQty] = useState(0);
  const [added, setAdded] = useState(false);

  const inCart = items.find((i) => i.sku === product.sku)?.quantity || 0;
  const remaining = Math.max(0, product.availableQty - inCart);
  const outOfStock = product.availableQty <= 0;
  const noSku = !product.sku;
  const canOrder = !outOfStock && !noSku;

  const handleAdd = () => {
    if (qty <= 0) return;
    addItem(product, qty);
    setQty(0);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article className="product-card">
      <div className="product-card-media">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} loading="lazy" decoding="async" />
        ) : (
          <div className="product-card-placeholder">No image</div>
        )}
      </div>
      <div className="product-card-body">
        <h3 className="product-card-title" title={product.title}>
          {product.title}
        </h3>
        <span className="product-card-sku" title={product.sku || 'No SKU'}>
          {product.sku || 'No SKU'}
        </span>
        <span className="product-card-price">{formatCurrency(product.price)}</span>
      </div>
      <div className="product-card-actions">
        {canOrder && <QuantityStepper value={qty} min={0} max={remaining} onChange={setQty} />}
        <div className="product-card-buttons">
          <button
            type="button"
            className="icon-btn-ghost"
            onClick={onQuickView}
            aria-label={`Quick view ${product.title}`}
            title="Quick view"
          >
            <EyeIcon />
          </button>
          {canOrder ? (
            <button
              type="button"
              className={added ? 'product-add-btn is-added' : 'product-add-btn'}
              disabled={qty <= 0}
              onClick={handleAdd}
              aria-label={`Add ${product.title} to cart`}
              title={added ? 'Added to cart' : 'Add to cart'}
            >
              {added ? <CheckIcon /> : <CartPlusIcon />}
              <span>{added ? 'Added' : 'Add'}</span>
            </button>
          ) : (
            <Badge tone="danger">{outOfStock ? 'Out of stock' : 'Not orderable'}</Badge>
          )}
        </div>
      </div>
    </article>
  );
}
