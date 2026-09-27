import { useCallback, useEffect, useState } from 'react';
import { getOrders } from '../services/api';
import type { Order, PageMeta } from '../types';

// One page (50) of the signed-in employee's orders - `filters` is { page, fromDate, toDate } - loaded
// with loading / error state and re-read on demand (refetch, e.g. after a cancel).
export function useLiveOrders(
  employeeEmail: string | undefined,
  { page = 1, fromDate, toDate }: { page?: number; fromDate?: string; toDate?: string } = {}
) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryKey = JSON.stringify({ employeeEmail, page, fromDate, toDate });

  const load = useCallback(async () => {
    if (!employeeEmail) return;
    setLoading(true);
    try {
      const res = await getOrders(JSON.parse(queryKey));
      setOrders(res.data || []);
      setMeta(res.meta);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [employeeEmail, queryKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { orders, meta, loading, error, refetch: load };
}
