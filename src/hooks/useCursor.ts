import { useCallback, useEffect, useState } from 'react';
import { readCursor, writeCursor, type CursorParams } from '../lib/cursor';

// URL-backed cursor state for a list screen (Orders, Employee Orders, Employee Management - see
// hooks/useCatalog.ts for Products/Shop, which layer the same lib/cursor.ts helpers over their own
// filter/sort URL sync instead of using this hook). The cursor lives in ?after=/?before=, so a
// refresh or the back button returns to the same page; setCursor is what CursorPagination's
// onCursor is wired to, and reset() is what a filter change calls to go back to the first page,
// same as useCatalog's update().
export interface CursorState {
  after?: string;
  before?: string;
}

function currentSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

function pushCursor(patch: CursorParams, replace: boolean): CursorParams {
  const next = writeCursor(currentSearchParams(), patch);
  const search = next.toString();
  const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
  return readCursor(next);
}

export function useCursor() {
  const [cursor, setCursorState] = useState<CursorState>(() => readCursor(currentSearchParams()));

  // A URL carrying both after and before (hand-edited, a stale bookmark, or a leftover from the
  // "Previous keeps the old after" bug) is invalid - cleaned on load without adding a history entry.
  useEffect(() => {
    const sp = currentSearchParams();
    if (sp.get('after') && sp.get('before')) setCursorState(pushCursor({}, true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back / forward: the URL is the source of truth.
  useEffect(() => {
    const onPop = () => setCursorState(readCursor(currentSearchParams()));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Next / Previous (pushState: back-button navigable, same as useCatalog's cursor changes).
  const setCursor = useCallback((patch: CursorParams) => setCursorState(pushCursor(patch, false)), []);
  // A filter change (replaceState: typing/selecting a filter should not flood browser history).
  const reset = useCallback(() => setCursorState(pushCursor({}, true)), []);

  return { cursor, setCursor, reset };
}
