import { useCallback, useEffect, useRef, useState } from 'react';
import { listAdminOrders, markOrderPaid, markOrderFulfilled } from '../services/api';
import { useOrderEvents } from '../hooks/useOrderEvents';
import AsyncState from '../components/AsyncState';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import SearchInput from '../components/SearchInput';
import Badge, { toneForStatus } from '../components/Badge';
import OrderStageBadge from '../components/OrderStageBadge';
import { LockIcon } from '../components/Icons';
import { formatCurrency, formatStatusLabel } from '../utils/formatters';
import { canMarkFulfilled, canMarkPaid, isOrderLocked, mergeOrderUpdate, orderStage } from '../utils/orderStage';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

// Admin-only: every order, with the Pending -> Paid -> Fulfilled actions. The list is live - a
// status change made anywhere (this screen, another admin, Shopify Admin: payment, fulfilment,
// delivery, cancel, refund) appears here and on the employee's Orders page without a refresh.
// Once an order is Fulfilled it is locked and offers no actions; the backend enforces that too,
// so the lock is not just a hidden button.
export default function OrderManagement() {
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null); // { id, kind } while an action is in flight
  const [actionError, setActionError] = useState(null);
  const [message, setMessage] = useState(null);

  const requestId = useRef(0);
  const patchVersion = useRef(0); // bumped by every live patch so an older reload never overwrites it

  // silent = reload in the background (no spinner, keep what is shown if it fails).
  const load = useCallback(
    async ({ silent = false } = {}) => {
      const id = (requestId.current += 1);
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const versionAtStart = patchVersion.current;
        try {
          const res = await listAdminOrders({ page, pageSize: PAGE_SIZE, q: query });
          if (id !== requestId.current) return; // a newer request superseded this one
          if (patchVersion.current !== versionAtStart && attempt === 0) continue; // a live update landed: read again
          setResult(res.data);
          setError(null);
        } catch (err) {
          if (id === requestId.current && !silent) setError(err.message);
        }
        break;
      }
      if (id === requestId.current && !silent) setLoading(false);
    },
    [page, query]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchText.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  // Live updates. A change to an order on this page patches its row in place; a change to an
  // order that is not on the page reloads page 1 (that is where a new order appears).
  const latest = useRef({});
  useEffect(() => {
    latest.current = { items: result.items, page, query, load };
  });
  const handleOrderEvent = useCallback((event) => {
    const { items, page: currentPage, query: currentQuery, load: reload } = latest.current;
    if (items.some((o) => o.id === event.id)) {
      patchVersion.current += 1;
      setResult((prev) => ({ ...prev, items: prev.items.map((o) => (o.id === event.id ? mergeOrderUpdate(o, event) : o)) }));
    } else if (currentPage === 1 && !currentQuery) {
      reload({ silent: true });
    }
  }, []);
  const resync = useCallback(() => latest.current.load({ silent: true }), []);
  useOrderEvents({ onEvent: handleOrderEvent, onResync: resync });

  const runAction = async (order, kind) => {
    const verb = kind === 'paid' ? 'paid' : 'fulfilled';
    const warning =
      kind === 'fulfilled' ? ' A fulfilled order is locked: it can no longer be cancelled, edited or changed.' : '';
    if (!window.confirm(`Mark order ${order.shopifyOrderId} as ${verb}?${warning}`)) return;

    setActionError(null);
    setMessage(null);
    setBusy({ id: order.id, kind });
    try {
      const res = await (kind === 'paid' ? markOrderPaid : markOrderFulfilled)(order.shopifyOrderId);
      patchVersion.current += 1;
      setResult((prev) => ({ ...prev, items: prev.items.map((o) => (o.id === order.id ? { ...o, ...res.data } : o)) }));
      setMessage(`Order ${order.shopifyOrderId} marked as ${verb}`);
    } catch (err) {
      setActionError(err.message);
      // 409 = the order is not in the state this screen thought (e.g. another admin or Shopify
      // changed it first): bring the list up to date.
      if (err.status === 409) load({ silent: true });
    } finally {
      setBusy(null);
    }
  };

  const renderActions = (order) => {
    if (isOrderLocked(order)) {
      return (
        <span className="lock-chip" title="Fulfilled - no further changes are possible">
          <LockIcon size={13} />
          Locked
        </span>
      );
    }
    const stage = orderStage(order);
    if (stage === 'cancelled' || stage === 'refunded') return '—';

    const working = busy && busy.id === order.id;
    const payEnabled = canMarkPaid(order);
    const fulfilEnabled = canMarkFulfilled(order);
    return (
      <div className="order-row-actions">
        <button
          type="button"
          className="btn-ghost"
          disabled={!payEnabled || !!working}
          title={payEnabled ? undefined : 'Only a pending order can be marked as paid'}
          onClick={() => runAction(order, 'paid')}
        >
          {working && busy.kind === 'paid' && <span className="spinner-btn" />}
          {working && busy.kind === 'paid' ? 'Marking...' : 'Mark as Paid'}
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={!fulfilEnabled || !!working}
          title={fulfilEnabled ? undefined : 'Mark the order as paid first'}
          onClick={() => runAction(order, 'fulfilled')}
        >
          {working && busy.kind === 'fulfilled' && <span className="spinner-btn" />}
          {working && busy.kind === 'fulfilled' ? 'Marking...' : 'Mark as Fulfilled'}
        </button>
      </div>
    );
  };

  const columns = [
    { key: 'shopifyOrderId', label: 'Shopify Order ID', render: (o) => o.shopifyOrderId || '—' },
    {
      key: 'employee',
      label: 'Employee',
      render: (o) => (
        <span className="cell-stack">
          <span>{o.employeeName || '—'}</span>
          <span className="hint">{o.employeeEmail || ''}</span>
        </span>
      ),
    },
    { key: 'createdAt', label: 'Order Date', render: (o) => formatDate(o.createdAt) },
    { key: 'totalPrice', label: 'Total', render: (o) => (o.totalPrice == null ? '—' : formatCurrency(o.totalPrice)) },
    { key: 'stage', label: 'Order Stage', render: (o) => <OrderStageBadge order={o} /> },
    {
      key: 'financialStatus',
      label: 'Payment',
      render: (o) => (o.financialStatus ? <Badge tone={toneForStatus(o.financialStatus)}>{o.financialStatus}</Badge> : '—'),
    },
    {
      key: 'fulfillmentStatus',
      label: 'Fulfillment',
      render: (o) =>
        o.fulfillmentStatus ? <Badge tone={toneForStatus(o.fulfillmentStatus)}>{o.fulfillmentStatus}</Badge> : '—',
    },
    {
      key: 'deliveryStatus',
      label: 'Delivery',
      render: (o) =>
        o.deliveryStatus ? <Badge tone={toneForStatus(o.deliveryStatus)}>{formatStatusLabel(o.deliveryStatus)}</Badge> : '—',
    },
    { key: 'actions', label: '', render: renderActions },
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Order Management</h2>
        <span className="hint">
          {result.total} order{result.total === 1 ? '' : 's'}
        </span>
      </div>

      <SearchInput value={searchText} onChange={setSearchText} placeholder="Search by Shopify order ID, employee name or email" />

      {message && <div className="result result-success">{message}</div>}
      {actionError && <div className="error">{actionError}</div>}
      <AsyncState
        loading={loading}
        error={error}
        isEmpty={!loading && !error && result.items.length === 0}
        emptyLabel={query ? 'No orders match your search.' : 'No orders yet.'}
      />
      {!loading && !error && result.items.length > 0 && (
        <>
          <DataTable columns={columns} rows={result.items} rowKey={(o) => o.id} />
          <Pagination
            page={page}
            totalPages={result.totalPages}
            onChange={setPage}
            totalItems={result.total}
            pageSize={PAGE_SIZE}
          />
        </>
      )}
    </div>
  );
}
