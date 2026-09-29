import { useState } from 'react';
import { useCatalog } from '../hooks/useCatalog';
import { useCart } from '../context/CartContext';
import CatalogToolbar from '../components/CatalogToolbar';
import CatalogResults from '../components/CatalogResults';
import ProductRow from '../components/ProductRow';
import CursorPagination from '../components/CursorPagination';
import QuickViewModal from '../components/QuickViewModal';

export default function Shop({ onViewCart }: { onViewCart: () => void }) {
  const catalog = useCatalog();
  const { itemCount } = useCart();
  const { data, pageInfo } = catalog;

  // The variant the customer clicked - the quick view opens that product with it selected.
  const [quickViewKey, setQuickViewKey] = useState<string | number | null>(null);

  return (
    <div className="panel">
      <div className="shop-header">
        <h2>Shop</h2>
        {itemCount > 0 && (
          <button type="button" className="btn-primary" onClick={onViewCart}>
            View Cart ({itemCount})
          </button>
        )}
      </div>
      <CatalogToolbar catalog={catalog} placeholder="Search by name, SKU, size, color…" />
      <CatalogResults catalog={catalog}>
        <div className="product-grid">
          {data?.map((p) => (
            <ProductRow key={p.variantId} product={p} onQuickView={() => setQuickViewKey(p.variantId)} />
          ))}
        </div>
      </CatalogResults>
      {pageInfo && <CursorPagination pageInfo={pageInfo} onCursor={catalog.setCursor} />}
      {quickViewKey && <QuickViewModal productKey={quickViewKey} onClose={() => setQuickViewKey(null)} />}
    </div>
  );
}
