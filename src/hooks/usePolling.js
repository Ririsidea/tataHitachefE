import { useEffect, useState } from 'react';

export function usePolling(fetchFn, intervalMs) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  // Only the very first fetch shows a loading state - background poll refreshes
  // afterwards update silently so the feed doesn't flash a spinner every interval.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetchFn();
        if (active) {
          setData(res);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, intervalMs);
    return () => {
      active = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return { data, error, loading };
}
