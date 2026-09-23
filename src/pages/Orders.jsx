import { useEffect, useMemo, useState } from 'react';
import { getOrders, cancelOrder, getStock } from '../services/api';
import { useAsyncData } from '../hooks/useAsyncData';
import AsyncState from '../components/AsyncState';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import Badge, { toneForStatus } from '../components/Badge';
import OrderDetailsModal from '../components/OrderDetailsModal';

const PAGE_SIZE = 10;

// Local date parts, not toISOString().slice(0, 10) - the latter round-trips
// through UTC and can shift an order onto the wrong calendar day for any
// timezone ahead of UTC (e.g. IST), which would make the date filter miss it.
function toLocalDateOnly(value) {
  const d = new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function Orders() {
  const { data, loading, error, refetch } = useAsyncData(getOrders);
  const { data: stockData } = useAsyncData(getStock);
  const orders = data?.data || [];

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const filteredOrders = useMemo(() => {
    if (!fromDate && !toDate) return orders;
    return orders.filter((o) => {
      if (!o.createdAt) return false;
      const orderDate = toLocalDateOnly(o.createdAt);
      if (fromDate && orderDate < fromDate) return false;
      if (toDate && orderDate > toDate) return false;
      return true;
    });
  }, [orders, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pageItems = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Orders come back newest-first from the API; if a cancel/refetch/filter change
  // drops the current page, snap back onto the last valid page instead of
  // showing an empty page.
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setPage(1);
  };
  const productsBySku = useMemo(() => {
    const map = {};
    (stockData?.data || []).forEach((p) => {
      if (p.sku) map[p.sku] = p;
    });
    return map;
  }, [stockData]);
  const [cancellingId, setCancellingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [detailsOrder, setDetailsOrder] = useState(null);

  const handleCancel = async (order) => {
    if (!window.confirm(`Cancel order ${order.shopifyOrderId || order.id}?`)) return;
    setActionError(null);
    setCancellingId(order.id);
    try {
      await cancelOrder(order.id);
      refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  const columns = [
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
      key: 'actions',
      label: '',
      render: (o) => (
        <div className="order-row-actions">
          <button type="button" className="btn-ghost" onClick={() => setDetailsOrder(o)}>
            View Details
          </button>
          {o.canCancel && (
            <button
              type="button"
              className="btn-ghost"
              disabled={cancellingId === o.id}
              onClick={() => handleCancel(o)}
            >
              {cancellingId === o.id && <span className="spinner-btn" />}
              {cancellingId === o.id ? 'Cancelling...' : 'Cancel Order'}
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
          {filteredOrders.length} of {orders.length} order{orders.length === 1 ? '' : 's'}
        </span>
      </div>

      {!loading && !error && orders.length > 0 && (
        <div className="filters-row">
          <label>
            From
            <input type="date" value={fromDate} onChange={handleFilterChange(setFromDate)} max={toDate || undefined} />
          </label>
          <label>
            To
            <input type="date" value={toDate} onChange={handleFilterChange(setToDate)} min={fromDate || undefined} />
          </label>
          {(fromDate || toDate) && (
            <button type="button" className="btn-ghost" onClick={handleClearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {actionError && <div className="error">{actionError}</div>}
      <AsyncState
        loading={loading}
        error={error}
        isEmpty={!loading && !error && orders.length === 0}
        emptyLabel="No orders yet."
      />
      {!loading && !error && orders.length > 0 && filteredOrders.length === 0 && (
        <div className="empty">No orders in this date range.</div>
      )}
      {!loading && !error && pageItems.length > 0 && (
        <>
          <DataTable columns={columns} rows={pageItems} rowKey={(o) => o.id} />
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
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
