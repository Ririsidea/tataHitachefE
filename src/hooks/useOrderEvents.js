import { useEffect, useRef, useState } from 'react';
import { streamOrderEvents } from '../services/api';

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;
const FALLBACK_POLL_MS = 20000;

// Keeps a screen in step with order-status changes without a manual refresh.
//
// It holds the live stream open (GET /api/dashboard/order-events) and calls onEvent(order) for
// every change, whoever made it (admin action, cancel, edit, or a change made in Shopify: payment,
// fulfilment, delivery, refund). When the stream drops it reconnects with backoff, and while it is
// down it falls back to polling onResync every 20 s, so the screen can never stay stale. onResync
// is also called every time the stream (re)opens, which picks up anything missed while it was down.
//
// employeeEmail limits the feed to one employee's orders; leave it out to receive every order.
// Returns { connected } for the "Live" indicator.
export function useOrderEvents({ employeeEmail, onEvent, onResync, enabled = true }) {
  const [connected, setConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  const onResyncRef = useRef(onResync);
  useEffect(() => {
    onEventRef.current = onEvent;
    onResyncRef.current = onResync;
  });

  useEffect(() => {
    if (!enabled) return undefined;

    let stopped = false;
    let controller = null;
    let retryTimer = null;
    let pollTimer = null;
    let attempt = 0;

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => onResyncRef.current?.(), FALLBACK_POLL_MS);
    };
    const stopPolling = () => {
      clearInterval(pollTimer);
      pollTimer = null;
    };

    const connect = async () => {
      controller = new AbortController();
      try {
        await streamOrderEvents({
          employeeEmail,
          signal: controller.signal,
          onOpen: () => {
            attempt = 0;
            stopPolling();
            setConnected(true);
            onResyncRef.current?.();
          },
          onEvent: (event) => onEventRef.current?.(event),
        });
      } catch {
        // dropped or refused: handled below
      }
      if (stopped) return;
      setConnected(false);
      startPolling();
      retryTimer = setTimeout(connect, Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS));
      attempt += 1;
    };

    connect();

    return () => {
      stopped = true;
      controller?.abort();
      clearTimeout(retryTimer);
      stopPolling();
    };
  }, [employeeEmail, enabled]);

  return { connected };
}
