import type { ReactNode } from 'react';
import Spinner from './Spinner';
import type { Catalog } from '../hooks/useCatalog';
import { AlertIcon, InboxIcon } from './Icons';
import { hasFilters } from '../utils/catalogParams';

// The body of the product list. Shows the rows (`children`) when there are some, dimmed with an
// inline spinner while the next page loads; otherwise a spinner (first load), the error with
// Retry, or the empty state with Clear filters. Never the full-screen loader.
//   catalog: what useCatalog() returns.
export default function CatalogResults({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  const { data, loading, error, params, retry, clear } = catalog;
  const hasRows = Boolean(data && data.length > 0) && !error;

  let status = null;
  if (error) {
    status = (
      <div className="error catalog-error" role="alert">
        <AlertIcon size={18} />
        <span>{error}</span>
        <button type="button" className="btn-ghost" onClick={retry}>
          Retry
        </button>
      </div>
    );
  } else if (!data) {
    status = (
      <div className="async-loading">
        <Spinner />
      </div>
    );
  } else if (data.length === 0 && !loading) {
    const filtered = Boolean(params.q) || hasFilters(params);
    status = (
      <div className="empty catalog-empty">
        <span className="empty-icon">
          <InboxIcon size={22} />
        </span>
        <span>{params.q ? `No products found for '${params.q}'` : filtered ? 'No products match these filters' : 'No products found'}</span>
        {filtered && (
          <button type="button" className="btn-ghost" onClick={clear}>
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="catalog-results" aria-busy={loading}>
      {status}
      {hasRows && <div className={loading ? 'catalog-rows is-loading' : 'catalog-rows'}>{children}</div>}
      {hasRows && loading && (
        <div className="catalog-busy">
          <Spinner size={26} />
        </div>
      )}
    </div>
  );
}
