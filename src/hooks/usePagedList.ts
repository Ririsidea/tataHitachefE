import { useCallback, useEffect, useRef, useState } from 'react';
import type { PageMeta, Paged } from '../types';

// One page (50 rows, ?page=) of a list endpoint that follows the shared contract
// { success, data: [...], meta: { page, limit, total, totalPages, hasNextPage, hasPrevPage, filters } }.
//
//   fetchPage(params)  -> the parsed response ({ data, meta }); `params` always carries `page`
//   params             page + the endpoint's filters; a new value (compared by content) loads again
//   onPastEnd(last)    called when the requested page is past the last one (rows were removed since),
//                      so the screen can step back to page `last`
// While a new page loads the previous rows stay in `items`, so the list does not flash empty.
// Returns { items, meta, loading, error, refetch }.
interface PagedListState<T> {
  items: T[] | null;
  meta: PageMeta | null;
  loading: boolean;
  error: string | null;
}

export function usePagedList<T, P extends { page: number }>(
  fetchPage: (params: P) => Promise<Paged<T>>,
  params: P,
  onPastEnd?: (lastPage: number) => void
) {
  const [state, setState] = useState<PagedListState<T>>({ items: null, meta: null, loading: true, error: null });
  const [reloadToken, setReloadToken] = useState(0);
  const key = JSON.stringify(params);
  const latest = useRef({ fetchPage, onPastEnd });
  useEffect(() => {
    latest.current = { fetchPage, onPastEnd };
  });

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, error: null, loading: true }));
    latest.current
      .fetchPage(JSON.parse(key) as P)
      .then((res) => {
        if (!active) return;
        setState({ items: res.data, meta: res.meta, loading: false, error: null });
        const { page, totalPages } = res.meta;
        if (res.data.length === 0 && totalPages > 0 && page > totalPages) latest.current.onPastEnd?.(totalPages);
      })
      .catch((err: Error) => {
        if (active) setState((prev) => ({ ...prev, loading: false, error: err.message }));
      });
    return () => {
      active = false;
    };
  }, [key, reloadToken]);

  const refetch = useCallback(() => setReloadToken((n) => n + 1), []);
  return { ...state, refetch };
}
