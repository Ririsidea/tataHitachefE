import { useEffect, useMemo, useRef, useState } from 'react';
import SearchInput from './SearchInput';
import ProductThumb from './ProductThumb';
import { formatCurrency } from '../utils/formatters';
import { maxQuantity, searchProducts, stockLabel } from '../utils/orderEdit';

const DEBOUNCE_MS = 250;
const MAX_RESULTS = 8;

// "Add product" box of the Edit Order modal. Shows nothing but the search field until the user
// searches (debounced while typing, immediately on Enter); results come from the product list the
// Orders page has already loaded, so opening the modal costs no request.
//   onAdd(product) -> { status, key, quantity }  (see addProductOutcome in utils/orderEdit.js)
export default function AddProductSearch({ products, lines, stock, loading, error, onRetry, onAdd }) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [notice, setNotice] = useState(null); // { tone: 'success' | 'warning', text }
  const inputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const term = query.trim();
  const searching = Boolean(term) && (loading || term !== debounced.trim());
  const { results, total } = useMemo(
    () => (term && !searching && !error ? searchProducts(products, lines, debounced, MAX_RESULTS) : { results: [], total: 0 }),
    [products, lines, debounced, term, searching, error]
  );

  const handleQuery = (value) => {
    setQuery(value);
    setNotice(null);
  };

  const handleAdd = (product) => {
    const outcome = onAdd(product);
    const name = product.title;
    const qty = outcome.quantity;
    const messages = {
      added: { tone: 'success', text: `Added ${name} to the order.` },
      increased: { tone: 'success', text: `${name} is already in the order - quantity increased to ${qty}.` },
      restored: { tone: 'success', text: `${name} is back in the order.` },
      max: { tone: 'warning', text: `${name} is already at the maximum available quantity (${qty}).` },
      locked: { tone: 'warning', text: `${name} has already been fulfilled and can't be changed.` },
      unavailable: { tone: 'warning', text: `${name} is out of stock.` },
    };
    setNotice(messages[outcome.status] || null);
    if (['added', 'increased', 'restored'].includes(outcome.status)) {
      setQuery('');
      setDebounced('');
      inputRef.current?.focus(); // ready for the next product
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // Enter searches; it must never submit or save the order.
      e.preventDefault();
      if (!term) return;
      setDebounced(query);
      // A SKU typed/scanned exactly (and matching a single product) is unambiguous - add it.
      const { results: found } = searchProducts(products, lines, query, MAX_RESULTS);
      const exact = found.filter((p) => String(p.sku).toLowerCase() === term.toLowerCase());
      if (!loading && !error && exact.length === 1 && found.length === 1) handleAdd(exact[0]);
    } else if (e.key === 'Escape' && query) {
      // first Escape clears the search; only an empty search lets Escape close the modal
      e.preventDefault();
      e.stopPropagation();
      handleQuery('');
      setDebounced('');
    }
  };

  let body = null;
  if (term) {
    if (error) {
      body = (
        <div className="error edit-add-error" role="alert">
          <span>Unable to search products. Please try again.</span>
          <button type="button" className="btn-ghost" onClick={onRetry}>Retry</button>
        </div>
      );
    } else if (searching) {
      body = (
        <p className="edit-add-state" role="status">
          <span className="spinner-btn" />
          Searching products...
        </p>
      );
    } else if (results.length === 0) {
      body = (
        <div className="edit-add-empty" role="status">
          <strong>No products found.</strong>
          <span>Try another product name or SKU.</span>
        </div>
      );
    } else {
      body = (
        <div className="edit-add-results">
          <div className="edit-add-results-head">
            <h5>Search results</h5>
            <span className="hint">{total} match{total === 1 ? '' : 'es'}</span>
          </div>
          <ul className="edit-add-list">
            {results.map((p) => {
              const line = p.line;
              const available = Number(p.availableQty) || 0;
              const atMax = line ? line.locked || line.quantity >= maxQuantity(line, stock) : false;
              const disabled = line ? atMax : available <= 0;
              const stockInfo = stockLabel(available);
              return (
                <li className="edit-add-result" key={p.sku}>
                  <ProductThumb url={p.imageUrl} title={p.title} />
                  <div className="edit-line-info">
                    <span className="edit-line-title" title={p.title}>{p.title}</span>
                    <span className="edit-line-meta">
                      SKU: {p.sku}
                      {p.price !== null && p.price !== undefined && ` · ${formatCurrency(p.price)}`}
                    </span>
                    <span className="edit-line-tags">
                      <span className={`stock-tag stock-${stockInfo.tone}`}>{stockInfo.text}</span>
                      {line && <span className="in-order-tag">In order × {line.quantity}</span>}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-add"
                    disabled={disabled}
                    aria-label={`${line ? 'Add one more' : 'Add'} ${p.title} to order`}
                    onClick={() => handleAdd(p)}
                  >
                    {line ? (atMax ? 'Max reached' : 'Add one more') : 'Add'}
                  </button>
                </li>
              );
            })}
          </ul>
          {total > results.length && (
            <p className="hint">Showing the first {results.length} of {total} matches. Refine your search to narrow it down.</p>
          )}
        </div>
      );
    }
  }

  return (
    <div className="edit-add">
      <h4>Add product</h4>
      <SearchInput
        className="edit-add-search"
        value={query}
        onChange={handleQuery}
        onKeyDown={handleKeyDown}
        inputRef={inputRef}
        placeholder="Search products by name or SKU"
      />
      <div aria-live="polite">
        {notice && <p className={`edit-add-notice edit-add-notice-${notice.tone}`}>{notice.text}</p>}
      </div>
      {!term && !notice && <p className="hint">Type a product name or SKU. Matching products appear here.</p>}
      {body}
    </div>
  );
}
