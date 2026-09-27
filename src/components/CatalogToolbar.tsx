import { useEffect, useState } from 'react';
import SearchInput from './SearchInput';
import type { Catalog } from '../hooks/useCatalog';

const SEARCH_DEBOUNCE_MS = 300;

// The facet value that equals `current` ignoring case, so the <select> shows it as selected.
const matchValue = (list: string[], current: string) => list.find((v) => v.toLowerCase() === current.toLowerCase()) ?? current;
const withCurrent = (list: string[], current: string) => (current && !list.includes(matchValue(list, current)) ? [current, ...list] : list);

// Search box (debounced) and the category filter of the product list, in one row.
//   catalog: what useCatalog() returns.
export default function CatalogToolbar({ catalog, placeholder }: { catalog: Catalog; placeholder?: string }) {
  const { params, update, clear, meta } = catalog;
  const [text, setText] = useState(params.q);
  const categories = withCurrent(meta?.facets?.categories || [], params.category);

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
    <div className="catalog-toolbar">
      <SearchInput value={text} onChange={setText} placeholder={placeholder} className="catalog-search" />
      {categories.length > 0 && (
        <label className="catalog-field">
          <span>Category</span>
          <select value={matchValue(categories, params.category)} onChange={(e) => update({ category: e.target.value })}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      )}
      {(params.category || params.q) && (
        <button type="button" className="btn-ghost catalog-clear" onClick={clear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
