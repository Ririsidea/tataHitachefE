import { useCallback, useEffect, useRef, useState } from 'react';
import { getOrders, isRequestCancelled, type OrderParams } from '../services/api';
import { cleanParams } from '../lib/cursor';
import type { Order, PageInfo } from '../types';

// One cursor page (default 50) of the signed-in employee's orders - `filters` is { after,
// before, fromDate, toDate } - loaded with loading / error state and re-read on demand
// (refetch, e.g. after a cancel). Any request still in flight for the previous filters is
// aborted when they change or the component unmounts.
export function useLiveOrders(
  email: string | undefined,
  { after, before, fromDate, toDate }: { after?: string; before?: string; fromDate?: string; toDate?: string } = {}
) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryKey = JSON.stringify({ email, after, before, fromDate, toDate });
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!email) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    try {
      const res = await getOrders(cleanParams(JSON.parse(queryKey)) as OrderParams, controller.signal);
      setOrders(res.data || []);
      setPageInfo(res.pageInfo);
      setError(null);
    } catch (err) {
      if (isRequestCancelled(err)) return;
      setError((err as Error).message);
    } finally {
      if (controllerRef.current === controller) setLoading(false);
    }
  }, [email, queryKey]);

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  return { orders, pageInfo, loading, error, refetch: load };
}
