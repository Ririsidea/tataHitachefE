import { useEffect, useRef, useState } from 'react';
import { getProductDetail } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAsyncData } from '../hooks/useAsyncData';
import Spinner from './Spinner';
import QuantityStepper from './QuantityStepper';
import Badge from './Badge';
import { formatCurrency } from '../utils/formatters';
import { CloseIcon } from './Icons';

const SWIPE_THRESHOLD = 40;

export default function QuickViewModal({ productId, onClose }) {
  const { data, loading, error } = useAsyncData(() => getProductDetail(productId));
  const product = data?.data;
  const { items, addItem } = useCart();

  const [imageIndex, setImageIndex] = useState(0);
  const [variantIndex, setVariantIndex] = useState(0);
  const [qty, setQty] = useState(0);
  const [added, setAdded] = useState(false);
  const touchStartX = useRef(null);

  const images = product?.images || [];
  const variants = product?.variants || [];
  const variant = variants[variantIndex];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setImageIndex((i) => (images.length ? (i - 1 + images.length) % images.length : 0));
      if (e.key === 'ArrowRight') setImageIndex((i) => (images.length ? (i + 1) % images.length : 0));
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  const goPrev = () => setImageIndex((i) => (images.length ? (i - 1 + images.length) % images.length : 0));
  const goNext = () => setImageIndex((i) => (images.length ? (i + 1) % images.length : 0));

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > SWIPE_THRESHOLD) goPrev();
    else if (delta < -SWIPE_THRESHOLD) goNext();
    touchStartX.current = null;
  };

  const inCart = variant ? items.find((i) => i.sku === variant.sku)?.quantity || 0 : 0;
  const remaining = variant ? Math.max(0, variant.availableQty - inCart) : 0;
  const canOrder = variant && variant.sku && variant.availableQty > 0;

  const handleAdd = () => {
    if (!canOrder || qty <= 0) return;
    addItem(
      { sku: variant.sku, title: product.title, price: variant.price, imageUrl: images[0], availableQty: variant.availableQty },
      qty
    );
    setQty(0);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>

        {loading && (
          <div className="modal-loading">
            <Spinner />
          </div>
        )}

        {error && (
          <div className="modal-loading">
            <div className="error">{error}</div>
          </div>
        )}

        {product && (
          <div className="quick-view-body">
            <div
              className="carousel"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {images.length > 0 ? (
                <img className="carousel-image" src={images[imageIndex]} alt={product.title} />
              ) : (
                <div className="carousel-image carousel-image-placeholder">No image</div>
              )}
              {images.length > 1 && (
                <>
                  <button type="button" className="carousel-arrow carousel-arrow-prev" onClick={goPrev} aria-label="Previous image">
                    ‹
                  </button>
                  <button type="button" className="carousel-arrow carousel-arrow-next" onClick={goNext} aria-label="Next image">
                    ›
                  </button>
                  <div className="carousel-dots">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={i === imageIndex ? 'carousel-dot active' : 'carousel-dot'}
                        onClick={() => setImageIndex(i)}
                        aria-label={`Image ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="quick-view-details">
              <span className="eyebrow">{product.category}</span>
              <h2>{product.title}</h2>
              <p className="quick-view-price">{formatCurrency(variant?.price)}</p>

              {product.description && <p className="quick-view-description">{product.description}</p>}

              {variants.length > 1 && (
                <div className="quick-view-variants">
                  {variants.map((v, i) => (
                    <button
                      key={v.id}
                      type="button"
                      className={i === variantIndex ? 'pill pill-active' : 'pill'}
                      onClick={() => {
                        setVariantIndex(i);
                        setQty(0);
                      }}
                    >
                      {v.title}
                    </button>
                  ))}
                </div>
              )}

              {product.tags?.length > 0 && (
                <div className="quick-view-tags">
                  {product.tags.map((tag) => (
                    <Badge key={tag} tone="info">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="quick-view-actions">
                {canOrder ? (
                  <>
                    <QuantityStepper value={qty} min={0} max={remaining} onChange={setQty} />
                    <button type="button" className="btn-primary" disabled={qty <= 0} onClick={handleAdd}>
                      {added ? 'Added!' : 'Add to Cart'}
                    </button>
                  </>
                ) : (
                  <Badge tone="danger">{variant && variant.availableQty <= 0 ? 'Out of stock' : 'Not orderable'}</Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
