import { useEffect, useState } from 'react';
import SearchInput from './SearchInput';
import { useAsyncData } from '../hooks/useAsyncData';
import { getAllCategories } from '../services/api';
import type { Catalog } from '../hooks/useCatalog';

const SEARCH_DEBOUNCE_MS = 300;

// Search box (debounced), category pills and a "Clear filters" link for the product list.
// Category names are read from GET /api/map/stock itself (every row already carries its own
// `category` - see services/api.ts getAllCategories), not a separate facets field.
//   catalog: what useCatalog() returns.
export default function CatalogToolbar({ catalog, placeholder }: { catalog: Catalog; placeholder?: string }) {
  const { params, update, clear } = catalog;
  const [text, setText] = useState(params.q);
  const { data: categories, loading: categoriesLoading, error: categoriesError, refetch: retryCategories } = useAsyncData(getAllCategories);

  // The URL changed under us (back button, "Clear filters"): show what it says.
  useEffect(() => {
    setText((current) => (current.trim() === params.q ? current : params.q));
  }, [params.q]);

  useEffect(() => {
    const term = text.trim();
    if (term === params.q) return undefined;
    const timer = setTimeout(() => update({ q: term }, { replace: true }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="catalog-toolbar-wrap">
      <div className="catalog-toolbar">
        <SearchInput value={text} onChange={setText} placeholder={placeholder} className="catalog-search" />
        {(params.category || params.q) && (
          <button type="button" className="btn-ghost catalog-clear" onClick={clear}>
            Clear filters
          </button>
        )}
      </div>
      {categoriesLoading && (
        <div className="category-pills category-pills-loading" aria-hidden="true">
          <span className="pill-skeleton" />
          <span className="pill-skeleton" />
          <span className="pill-skeleton" />
        </div>
      )}
      {!categoriesLoading && categoriesError && (
        <div className="hint categories-hint">
          <span>Couldn't load categories.</span>
          <button type="button" className="btn-ghost" onClick={retryCategories}>
            Retry
          </button>
        </div>
      )}
      {!categoriesLoading && !categoriesError && categories && categories.length > 0 && (
        <div className="category-pills" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={params.category ? 'pill' : 'pill pill-active'}
            onClick={() => update({ category: '' })}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={params.category === cat ? 'pill pill-active' : 'pill'}
              onClick={() => update({ category: params.category === cat ? '' : cat })}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
