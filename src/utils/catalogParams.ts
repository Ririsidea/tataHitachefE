// Product list state <-> URL query string <-> GET /api/map/stock parameters.
// Pure functions (no React, no window) - unit-tested in test/catalogParams.test.ts.
//
//   params: { q, category, color, size, inStock ('' | 'true' | 'false'),
//             minPrice, maxPrice, sort ('' = server default), order }
// Everything is a string ('' = not set), so it round-trips through a URL untouched. Cursor
// pagination (after/before) is not part of this object - see lib/cursor.ts and hooks/useCatalog.ts.

import type { CatalogParams } from '../types';

type FilterKey = 'category' | 'color' | 'size' | 'inStock' | 'minPrice' | 'maxPrice';
type CatalogKey = 'q' | FilterKey | 'sort' | 'order';

export const EMPTY_FILTERS: Record<FilterKey, string> = { category: '', color: '', size: '', inStock: '', minPrice: '', maxPrice: '' };
export const FILTER_KEYS = Object.keys(EMPTY_FILTERS) as FilterKey[];
export const CATALOG_KEYS: CatalogKey[] = ['q', ...FILTER_KEYS, 'sort', 'order'];
export const DEFAULT_PARAMS: CatalogParams = { q: '', ...EMPTY_FILTERS, sort: '', order: '' };

const NUMBER = /^\d+(\.\d+)?$/;

export function parseSearch(search: string): CatalogParams {
  const query = new URLSearchParams(search);
  const text = (key: string) => (query.get(key) || '').trim();
  const number = (key: string) => (NUMBER.test(text(key)) ? text(key) : '');
  const inStock = text('inStock');

  return {
    q: text('q').slice(0, 100),
    category: text('category'),
    color: text('color'),
    size: text('size'),
    inStock: inStock === 'true' || inStock === 'false' ? inStock : '',
    minPrice: number('minPrice'),
    maxPrice: number('maxPrice'),
    sort: ['relevance', 'title', 'price', 'stock', 'newest'].includes(text('sort')) ? text('sort') : '',
    order: ['asc', 'desc'].includes(text('order')) ? text('order') : '',
  };
}

// Only what differs from the defaults goes in the URL, so the plain list has a clean address.
export function toSearch(params: CatalogParams): string {
  const query = new URLSearchParams();
  for (const key of CATALOG_KEYS) {
    if (params[key]) query.set(key, params[key]);
  }
  return query.toString();
}

// Swaps the catalog parameters inside an existing query string and keeps every other one
// (for instance `tab`). Returns a string starting with "?" - or "" when nothing is left.
export function mergeSearch(currentSearch: string, catalogSearch: string): string {
  const merged = new URLSearchParams(currentSearch);
  for (const key of CATALOG_KEYS) merged.delete(key);
  for (const [key, value] of new URLSearchParams(catalogSearch)) merged.set(key, value);
  const text = merged.toString();
  return text ? `?${text}` : '';
}

// The request for GET /api/map/stock. Empty values are left out; limit is always sent
// explicitly (the first page is ?limit=50, same as every other list).
export function toApiParams(params: CatalogParams): Record<string, string | number> {
  const api: Record<string, string | number> = { limit: 50 };
  for (const key of CATALOG_KEYS) {
    if (params[key]) api[key] = params[key];
  }
  return api;
}

export const hasFilters = (params: CatalogParams) => FILTER_KEYS.some((key) => params[key]);
export const activeFilterCount = (params: CatalogParams) => FILTER_KEYS.filter((key) => params[key]).length;

// "minPrice above maxPrice" would be a 400 - the UI catches it first.
export const priceRangeInvalid = (values: Pick<CatalogParams, 'minPrice' | 'maxPrice'>) =>
  values.minPrice !== '' && values.maxPrice !== '' && Number(values.minPrice) > Number(values.maxPrice);

// Sort dropdown: one value "sort:order" per option; '' is the server default (best match when
// there is a search, otherwise title A-Z).
export function sortOptions(hasQuery: boolean) {
  return [
    { value: '', label: hasQuery ? 'Best match' : 'Title (A–Z)' },
    ...(hasQuery ? [{ value: 'title:asc', label: 'Title (A–Z)' }] : []),
    { value: 'title:desc', label: 'Title (Z–A)' },
    { value: 'price:asc', label: 'Price (low to high)' },
    { value: 'price:desc', label: 'Price (high to low)' },
    { value: 'stock:desc', label: 'Stock (most first)' },
    { value: 'stock:asc', label: 'Stock (least first)' },
    { value: 'newest:desc', label: 'Newest' },
  ];
}

export const sortValue = (params: Pick<CatalogParams, 'sort' | 'order'>) => (params.sort ? `${params.sort}:${params.order || ''}`.replace(/:$/, '') : '');
export function splitSortValue(value: string) {
  const [sort = '', order = ''] = value.split(':');
  return { sort, order };
}
