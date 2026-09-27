import { useCallback, useEffect, useRef, useState } from 'react';
import { getStock } from '../services/api';
import type { CatalogParams, PageMeta, StockRow } from '../types';
import { DEFAULT_PARAMS, EMPTY_FILTERS, mergeSearch, parseSearch, toApiParams, toSearch } from '../utils/catalogParams';

// One page of the product list (GET /api/map/stock, 50 rows) for the current search, filters,
// sort and page. All of that lives in the URL query string, so a refresh or the back button
// brings the same page back. Shop and Products both use it.
//
//   update(patch, { replace })  change search / filters / sort - goes back to page 1 unless the
//                               patch sets `page`. `replace` edits the current history entry
//                               (typing) instead of adding one.
//   clear()                     drop the search and every filter
//   retry()                     ask again after an error
// While a new page loads the previous rows stay in `data` so the list does not flash empty.
export interface CatalogState {
  data: StockRow[] | null;
  meta: PageMeta | null;
  error: string | null;
  loading: boolean;
}

export type Catalog = ReturnType<typeof useCatalog>;

export function useCatalog() {
  const [params, setParams] = useState<CatalogParams>(() => parseSearch(window.location.search));
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  });

  const [result, setResult] = useState<CatalogState>({ data: null, meta: null, error: null, loading: true });
  const [reloadToken, setReloadToken] = useState(0);

  // Back / forward: the URL is the source of truth.
  useEffect(() => {
    const onPop = () => setParams(parseSearch(window.location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const commit = useCallback((next: CatalogParams, replace: boolean) => {
    paramsRef.current = next;
    setParams(next);
    const search = mergeSearch(window.location.search, toSearch(next));
    if (search === window.location.search) return;
    const url = `${window.location.pathname}${search}${window.location.hash}`;
    window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
  }, []);

  const update = useCallback(
    (patch: Partial<CatalogParams>, { replace = false }: { replace?: boolean } = {}) => {
      const next = { ...paramsRef.current, ...patch };
      if (!('page' in patch)) next.page = 1;
      commit(next, replace);
    },
    [commit]
  );

  const clear = useCallback(() => commit({ ...DEFAULT_PARAMS, ...EMPTY_FILTERS }, false), [commit]);
  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  const requestKey = JSON.stringify(toApiParams(params));
  useEffect(() => {
    let active = true;
    setResult((prev) => ({ ...prev, error: null, loading: true }));
    getStock(JSON.parse(requestKey))
      .then((res) => {
        if (active) setResult({ data: res.data, meta: res.meta, error: null, loading: false });
      })
      .catch((err: Error) => {
        if (active) setResult((prev) => ({ ...prev, error: err.message, loading: false }));
      });
    return () => {
      active = false;
    };
  }, [requestKey, reloadToken]);

  return { params, update, clear, retry, ...result };
}
