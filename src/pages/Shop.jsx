import { useMemo, useState } from 'react';
import { useStock } from '../hooks/useStock';
import { useCart } from '../context/CartContext';
import AsyncState from '../components/AsyncState';
import ListSkeleton from '../components/ListSkeleton';
import ProductRow from '../components/ProductRow';
import Pagination from '../components/Pagination';
import SearchInput from '../components/SearchInput';
import QuickViewModal from '../components/QuickViewModal';

const PAGE_SIZE = 10;

export default function Shop({ onViewCart }) {
  const { data, loading, error } = useStock();
  const { itemCount } = useCart();
  const products = data?.data || [];

  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [quickViewProductId, setQuickViewProductId] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category || 'Uncategorized'));
    return ['All', ...[...set].sort()];
  }, [products]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((p) => {
      const inCategory = activeCategory === 'All' || (p.category || 'Uncategorized') === activeCategory;
      if (!inCategory) return false;
      if (!query) return true;
      return p.title.toLowerCase().includes(query) || (p.sku || '').toLowerCase().includes(query);
    });
  }, [products, activeCategory, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCategoryClick = (category) => {
    setActiveCategory(category);
    setPage(1);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

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
      {loading && <ListSkeleton variant="grid" />}
      <AsyncState
        loading={false}
        error={loading ? null : error}
        isEmpty={!loading && products.length === 0}
        emptyLabel="No products found in Shopify."
      />
      {!loading && !error && products.length > 0 && (
        <>
          <SearchInput value={search} onChange={handleSearchChange} placeholder="Search products by name or SKU" />
          <div className="category-pills">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={category === activeCategory ? 'pill pill-active' : 'pill'}
                onClick={() => handleCategoryClick(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <AsyncState loading={false} error={null} isEmpty={filtered.length === 0} emptyLabel="No products match your search." />
          {filtered.length > 0 && (
            <div className="product-grid">
              {pageItems.map((p) => (
                <ProductRow key={p.id} product={p} onQuickView={() => setQuickViewProductId(p.id)} />
              ))}
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
        </>
      )}
      {quickViewProductId && (
        <QuickViewModal productId={quickViewProductId} onClose={() => setQuickViewProductId(null)} />
      )}
    </div>
  );
}
