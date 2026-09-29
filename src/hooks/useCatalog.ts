import { useCallback, useEffect, useRef, useState } from 'react';
import { getStock, isRequestCancelled } from '../services/api';
import type { CatalogParams, PageInfo, StockRow } from '../types';
import { DEFAULT_PARAMS, EMPTY_FILTERS, mergeSearch, parseSearch, toApiParams, toSearch } from '../utils/catalogParams';
import { cleanParams, readCursor, writeCursor, type CursorParams } from '../lib/cursor';

// One cursor page of the product list (GET /api/map/stock, limit=50) for the current search,
// filters, sort and cursor. All of that lives in the URL query string, so a refresh or the back
// button brings the same page back. Shop and Products both use it.
//
//   update(patch, { replace })  change search / filters / sort - always goes back to the first
//                               page (the cursor is cleared via lib/cursor.ts's writeCursor, never
//                               by spreading a patch over the previous params - that spread was the
//                               bug where Previous kept the old after around). `replace` edits the
//                               current history entry (typing) instead of adding one.
//   setCursor(patch)            Next / Previous - CursorPagination's onCursor. Touches only the
//                               cursor, never the filters.
//   clear()                     drop the search and every filter (and the cursor)
//   retry()                     ask again after an error
// While a new page loads the previous rows stay in `data` so the list does not flash empty.
// Each params change aborts any request still in flight for the previous params, so a slow
// response for a page the user already left can never overwrite fresher data.
export interface CatalogState {
  data: StockRow[] | null;
  pageInfo: PageInfo | null;
  error: string | null;
  loading: boolean;
}

export type Catalog = ReturnType<typeof useCatalog>;

function currentSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

export function useCatalog() {
  const [params, setParams] = useState<CatalogParams>(() => parseSearch(window.location.search));
  const [cursor, setCursorState] = useState<CursorParams>(() => readCursor(currentSearchParams()));
  const paramsRef = useRef(params);
  const cursorRef = useRef(cursor);
  useEffect(() => {
    paramsRef.current = params;
    cursorRef.current = cursor;
  });

  const [result, setResult] = useState<CatalogState>({ data: null, pageInfo: null, error: null, loading: true });
  const [reloadToken, setReloadToken] = useState(0);

  // A URL carrying both after and before (hand-edited, a stale bookmark, or a leftover from the
  // "Previous keeps the old after" bug) is invalid - cleaned on load without adding a history entry.
  useEffect(() => {
    const sp = currentSearchParams();
    if (sp.get('after') && sp.get('before')) {
      const cleaned = writeCursor(sp, {});
      const search = cleaned.toString();
      const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
      window.history.replaceState(null, '', url);
      setCursorState({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back / forward: the URL is the source of truth.
  useEffect(() => {
    const onPop = () => {
      setParams(parseSearch(window.location.search));
      setCursorState(readCursor(currentSearchParams()));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const commit = useCallback((nextParams: CatalogParams, nextCursor: CursorParams, replace: boolean) => {
    paramsRef.current = nextParams;
    cursorRef.current = nextCursor;
    setParams(nextParams);
    setCursorState(nextCursor);
    const filterSearch = mergeSearch(window.location.search, toSearch(nextParams));
    const withCursor = writeCursor(new URLSearchParams(filterSearch), nextCursor);
    const search = withCursor.toString();
    const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (url === currentUrl) return;
    window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
  }, []);

  // Any filter / search / sort / limit change goes back to the first page - the cursor is always
  // cleared to {}, never merged from the previous state.
  const update = useCallback(
    (patch: Partial<CatalogParams>, { replace = false }: { replace?: boolean } = {}) => {
      const next = { ...paramsRef.current, ...patch };
      commit(next, {}, replace);
    },
    [commit]
  );

  // Next / Previous: only the cursor changes, filters are untouched. `patch` is
  // nextParams(pageInfo.nextCursor) or prevParams(pageInfo.previousCursor) from lib/cursor.ts.
  const setCursor = useCallback(
    (patch: CursorParams) => {
      commit(paramsRef.current, patch, false);
    },
    [commit]
  );

  const clear = useCallback(() => commit({ ...DEFAULT_PARAMS, ...EMPTY_FILTERS }, {}, false), [commit]);
  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  const requestKey = JSON.stringify(cleanParams({ ...toApiParams(params), ...cursor }));
  useEffect(() => {
    const controller = new AbortController();
    setResult((prev) => ({ ...prev, error: null, loading: true }));
    getStock(JSON.parse(requestKey), controller.signal)
      .then((res) => setResult({ data: res.data, pageInfo: res.pageInfo, error: null, loading: false }))
      .catch((err: Error) => {
        if (isRequestCancelled(err)) return;
        setResult((prev) => ({ ...prev, error: err.message, loading: false }));
      });
    return () => controller.abort();
  }, [requestKey, reloadToken]);

  return { params, cursor, update, setCursor, clear, retry, ...result };
}
