import { useCallback, useEffect, useRef, useState } from 'react';
import { getOrders } from '../services/api';
import { useOrderEvents } from './useOrderEvents';
import { mergeOrderUpdate } from '../utils/orderStage';

// The signed-in employee's orders, kept live: loaded once (with loading / error state), then
// updated in place as the backend pushes changes - a status changed by an admin here or in
// Shopify (payment, fulfilment, delivery, cancel, refund) shows up without a refresh and without
// the list flickering. Because the list comes from MySQL, the status is the same after a page
// refresh or a re-login.
export function useLiveOrders(employeeEmail) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const ordersRef = useRef(orders);
  const version = useRef(0); // bumped by every live patch: an older reload never overwrites it
  useEffect(() => {
    ordersRef.current = orders;
  });

  // Silent reload: keeps what is on screen; a failure keeps it too (the Live indicator shows it).
  const refresh = useCallback(async () => {
    if (!employeeEmail) return;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const versionAtStart = version.current;
      try {
        const res = await getOrders(employeeEmail);
        if (version.current !== versionAtStart) continue; // a newer live update landed meanwhile
        setOrders(res.data || []);
        setError(null);
      } catch {
        // keep the current list
      }
      return;
    }
  }, [employeeEmail]);

  // First load and the manual reload (after an edit / cancel), with loading and error state.
  const load = useCallback(async () => {
    if (!employeeEmail) return;
    setLoading(true);
    try {
      const res = await getOrders(employeeEmail);
      version.current += 1;
      setOrders(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [employeeEmail]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEvent = useCallback(
    (event) => {
      const existing = ordersRef.current.find((o) => o.id === event.id);
      if (!existing) {
        refresh(); // an order placed elsewhere: read the list again
        return;
      }
      version.current += 1;
      setOrders((prev) => prev.map((o) => (o.id === event.id ? mergeOrderUpdate(o, event) : o)));
    },
    [refresh]
  );

  const { connected } = useOrderEvents({
    employeeEmail,
    onEvent: handleEvent,
    onResync: refresh,
    enabled: !!employeeEmail,
  });

  return { orders, loading, error, refetch: load, connected };
}
