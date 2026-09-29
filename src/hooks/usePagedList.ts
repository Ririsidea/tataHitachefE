import { useCallback, useEffect, useRef, useState } from 'react';
import { isRequestCancelled } from '../services/api';
import { cleanParams } from '../lib/cursor';
import type { PageInfo, Paged } from '../types';

// One cursor page (default 50 rows, ?limit=/?after=/?before=) of a list endpoint that follows
// the shared contract { success, data: [...], pageInfo: { limit, offset, total, hasNextPage,
// hasPreviousPage, nextCursor, previousCursor, filters } }.
//
//   fetchPage(params, signal)  the parsed response ({ data, pageInfo }); `params` carries the
//                              current cursor (after/before, if any) plus the endpoint's filters
//   params                     a new value (compared by content) loads again
//   onPastEnd(previousCursor)  called when the requested page comes back empty but an earlier
//                              page exists (rows were removed since, e.g. a delete just above the
//                              last row on this page) - the screen steps back with this cursor
// While a new page loads the previous rows stay in `items`, so the list does not flash empty.
// Any request still in flight for the previous params is aborted when params change or the
// component unmounts, so a slow response can never overwrite fresher data.
// Returns { items, pageInfo, loading, error, refetch }.
interface PagedListState<T> {
  items: T[] | null;
  pageInfo: PageInfo | null;
  loading: boolean;
  error: string | null;
}

export function usePagedList<T, P extends { after?: string; before?: string }>(
  fetchPage: (params: P, signal?: AbortSignal) => Promise<Paged<T>>,
  params: P,
  onPastEnd?: (previousCursor: string) => void
) {
  const [state, setState] = useState<PagedListState<T>>({ items: null, pageInfo: null, loading: true, error: null });
  const [reloadToken, setReloadToken] = useState(0);
  const key = JSON.stringify(params);
  const latest = useRef({ fetchPage, onPastEnd });
  useEffect(() => {
    latest.current = { fetchPage, onPastEnd };
  });

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, error: null, loading: true }));
    latest.current
      .fetchPage(cleanParams(JSON.parse(key)) as P, controller.signal)
      .then((res) => {
        setState({ items: res.data, pageInfo: res.pageInfo, loading: false, error: null });
        const { total, hasPreviousPage, previousCursor } = res.pageInfo;
        if (res.data.length === 0 && total > 0 && hasPreviousPage && previousCursor) latest.current.onPastEnd?.(previousCursor);
      })
      .catch((err: Error) => {
        if (isRequestCancelled(err)) return;
        setState((prev) => ({ ...prev, loading: false, error: err.message }));
      });
    return () => controller.abort();
  }, [key, reloadToken]);

  const refetch = useCallback(() => setReloadToken((n) => n + 1), []);
  return { ...state, refetch };
}
