import { useEffect, useState, type ChangeEvent } from 'react';
import { cancelOrder } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLiveOrders } from '../hooks/useLiveOrders';
import { useSkuProducts } from '../hooks/useSkuProducts';
import { useCursor } from '../hooks/useCursor';
import AsyncState from '../components/AsyncState';
import DataTable from '../components/DataTable';
import CursorPagination from '../components/CursorPagination';
import Badge, { toneForStatus } from '../components/Badge';
import Loader from '../components/Loader';
import { formatStatusLabel } from '../utils/formatters';
import { endOfLocalDay, startOfLocalDay } from '../utils/dateRange';
import OrderDetailsModal from '../components/OrderDetailsModal';
import type { DataColumn, Order } from '../types';

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function Orders() {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const { cursor, setCursor, reset: resetCursor } = useCursor();

  // The list is one cursor page (default 50, newest first) read from the server with the date
  // range as a filter - the range is the employee's local days, sent as exact instants.
  const { orders, pageInfo, loading, error, refetch } = useLiveOrders(user?.email, {
    ...cursor,
    fromDate: startOfLocalDay(fromDate),
    toDate: endOfLocalDay(toDate),
  });
  // The full-screen loader is only for the first load; a reload after a cancel or a page
  // change keeps the inline spinner in the panel.
  const firstLoad = loading && orders.length === 0 && pageInfo === null;
  const hasRange = Boolean(fromDate || toDate);

  // Orders were removed from under this page (e.g. cancelling the last one on it): step back.
  useEffect(() => {
    if (pageInfo && !loading && orders.length === 0 && pageInfo.hasPreviousPage && pageInfo.previousCursor) {
      setCursor({ before: pageInfo.previousCursor });
    }
  }, [pageInfo, loading, orders.length, setCursor]);

  const handleFilterChange = (setter: (value: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    resetCursor();
  };

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    resetCursor();
  };
  // Orders are identified by their Shopify order id everywhere (details, cancel, status).
  const [cancellingId, setCancellingId] = useState<Order['shopifyOrderId'] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // The open modal follows its order by Shopify order id, so a live status change shows up inside it too.
  const [detailsId, setDetailsId] = useState<Order['shopifyOrderId'] | null>(null);
  const detailsOrder = detailsId == null ? null : orders.find((o) => o.shopifyOrderId === detailsId) || null;
  // Images for the items of the order whose details are open (looked up by SKU, not the whole catalog).
  const productsBySku = useSkuProducts(detailsOrder?.lineItems?.map((li) => li.sku));
  const setDetailsOrder = (order: Order | null) => setDetailsId(order ? order.shopifyOrderId ?? null : null);

  const handleCancel = async (order: Order) => {
    if (!order.shopifyOrderId) {
      setActionError('This order has no Shopify order id and cannot be cancelled');
      return;
    }
    if (!window.confirm(`Cancel order ${order.shopifyOrderId}?`)) return;
    setActionError(null);
    setCancellingId(order.shopifyOrderId);
    try {
      await cancelOrder(order.shopifyOrderId);
      refetch();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setCancellingId(null);
    }
  };

  const columns: DataColumn<Order>[] = [
    { key: 'shopifyOrderId', label: 'Shopify Order ID' },
    { key: 'createdAt', label: 'Order Date', render: (o) => formatDate(o.createdAt) },
    { key: 'status', label: 'Status', render: (o) => <Badge tone={toneForStatus(o.status)}>{o.status}</Badge> },
    {
      key: 'financialStatus',
      label: 'Financial',
      render: (o) =>
        o.financialStatus ? <Badge tone={toneForStatus(o.financialStatus)}>{o.financialStatus}</Badge> : '—',
    },
    {
      key: 'fulfillmentStatus',
      label: 'Fulfillment',
      render: (o) =>
        o.fulfillmentStatus ? (
          <Badge tone={toneForStatus(o.fulfillmentStatus)}>{o.fulfillmentStatus}</Badge>
        ) : (
          '—'
        ),
    },
    {
      key: 'deliveryStatus',
      label: 'Delivery',
      render: (o) =>
        o.deliveryStatus ? (
          <Badge tone={toneForStatus(o.deliveryStatus)}>{formatStatusLabel(o.deliveryStatus)}</Badge>
        ) : (
          '—'
        ),
    },
    {
      key: 'actions',
      label: '',
      render: (o) => (
        <div className="order-row-actions">
          <button type="button" className="btn-ghost" onClick={() => setDetailsOrder(o)}>
            View Details
          </button>
          {/* Cancel is offered only when the API says the order allows it. A placed order cannot be edited. */}
          {o.canCancel && (
            <button
              type="button"
              className="btn-ghost btn-danger-ghost"
              disabled={cancellingId === o.shopifyOrderId}
              onClick={() => handleCancel(o)}
            >
              {cancellingId === o.shopifyOrderId ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Orders</h2>
        <span className="hint">
          {pageInfo ? pageInfo.total : 0} order{pageInfo?.total === 1 ? '' : 's'}
        </span>
      </div>

      {!error && pageInfo && (pageInfo.total > 0 || hasRange) && (
        <div className="filters-row">
          <label>
            From
            <input type="date" value={fromDate} onChange={handleFilterChange(setFromDate)} max={toDate || undefined} />
          </label>
          <label>
            To
            <input type="date" value={toDate} onChange={handleFilterChange(setToDate)} min={fromDate || undefined} />
          </label>
          {hasRange && (
            <button type="button" className="btn-ghost" onClick={handleClearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {actionError && <div className="error">{actionError}</div>}
      <Loader show={firstLoad || cancellingId !== null} label={cancellingId !== null ? 'Cancelling order…' : 'Loading orders…'} />
      <AsyncState
        loading={loading && !firstLoad}
        error={error}
        isEmpty={!loading && !error && !!pageInfo && pageInfo.total === 0}
        emptyLabel={hasRange ? 'No orders in this date range.' : 'No orders yet.'}
      />
      {!error && orders.length > 0 && (
        <>
          <DataTable columns={columns} rows={orders} rowKey={(o) => o.id} />
          {pageInfo && <CursorPagination pageInfo={pageInfo} onCursor={setCursor} />}
        </>
      )}
      {detailsOrder && (
        <OrderDetailsModal
          order={detailsOrder}
          productsBySku={productsBySku}
          onClose={() => setDetailsOrder(null)}
        />
      )}
    </div>
  );
}
