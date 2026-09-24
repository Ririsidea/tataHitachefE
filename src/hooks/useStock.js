import { useCallback, useEffect, useRef, useState } from 'react';
import { getStock } from '../services/api';

// Shop, Products and Orders all read the same stock list. Fetching it separately on every
// tab switch made each visit wait for a full catalog read, so the list is shared here:
//   - the first visit starts (or joins) one request; later visits show the last copy at once
//     and refresh it quietly in the background (stale-while-revalidate);
//   - simultaneous callers share a single in-flight request;
//   - prefetchStock() lets the app start loading right after login.
let cached = null;
let inflight = null;

function fetchStock({ force = false } = {}) {
  const start = () => {
    const request = getStock()
      .then((res) => {
        cached = res;
        return res;
      })
      .finally(() => {
        if (inflight === request) inflight = null;
      });
    inflight = request;
    return request;
  };
  if (!inflight) return start();
  // A forced refresh (e.g. right after an order edit) must not reuse a request that began
  // before the change, so it waits for the current one and then asks again.
  return force ? inflight.then(start, start) : inflight;
}

export function prefetchStock() {
  fetchStock().catch(() => {});
}

export function clearStockCache() {
  cached = null;
}

export function useStock() {
  const [data, setData] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const load = useCallback((options) => {
    return fetchStock(options)
      .then((res) => {
        if (!mounted.current) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        // With a copy already on screen a failed refresh is silent; the copy stays usable.
        if (mounted.current && !cached) setError(err.message);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const refetch = useCallback(() => load({ force: true }), [load]);

  return { data, loading, error, refetch };
}
