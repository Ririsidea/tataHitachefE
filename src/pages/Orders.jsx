import { useEffect, useMemo, useState } from 'react';
import { cancelOrder } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLiveOrders } from '../hooks/useLiveOrders';
import { useStock } from '../hooks/useStock';
import AsyncState from '../components/AsyncState';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import Badge, { toneForStatus } from '../components/Badge';
import Loader from '../components/Loader';
import { formatStatusLabel } from '../utils/formatters';
import OrderDetailsModal from '../components/OrderDetailsModal';
import EditOrderModal from '../components/EditOrderModal';

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
  const { user } = useAuth();
  const [successMessage, setSuccessMessage] = useState(null);
  // The orders stay live: a change made by an admin here or in Shopify (payment, fulfilment,
  // delivery, cancel, refund) updates the row in place, no refresh needed.
  const { orders, loading, error, refetch, connected } = useLiveOrders(user?.email);
  // The full-screen loader is only for the first load; a reload after an edit / cancel keeps the
  // inline spinner in the panel.
  const firstLoad = loading && orders.length === 0;
  const { data: stockData, loading: stockLoading, error: stockError, refetch: refetchStock } = useStock();

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
  // The open modals follow their order by id, so a live status change shows up inside them too.
  const [detailsId, setDetailsId] = useState(null);
  const [editId, setEditId] = useState(null);
  const detailsOrder = detailsId == null ? null : orders.find((o) => o.id === detailsId) || null;
  const editTarget = editId == null ? null : orders.find((o) => o.id === editId) || null;
  const setDetailsOrder = (order) => setDetailsId(order ? order.id : null);
  const setEditTarget = (order) => setEditId(order ? order.id : null);

  // Auto-dismiss the success banner so it doesn't linger after the list has refreshed.
  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // Full edit (items / address / contact) saved: refresh the orders AND the stock figures.
  const handleEdited = (message) => {
    setEditTarget(null);
    setActionError(null);
    setSuccessMessage(message);
    refetch();
    refetchStock();
  };

  const handleCancel = async (order) => {
    if (!order.shopifyOrderId) {
      setActionError('This order has no Shopify order id and cannot be cancelled');
      return;
    }
    if (!window.confirm(`Cancel order ${order.shopifyOrderId}?`)) return;
    setActionError(null);
    setSuccessMessage(null);
    setCancellingId(order.id);
    try {
      await cancelOrder(order.shopifyOrderId);
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
          {/* Edit and Cancel are offered only when the API says the order allows them. */}
          {o.status === 'open' && o.canUpdate && (
            <button type="button" className="btn-ghost" onClick={() => setEditTarget(o)}>
              Update Order
            </button>
          )}
          {o.canCancel && (
            <button
              type="button"
              className="btn-ghost btn-danger-ghost"
              disabled={cancellingId === o.id}
              onClick={() => handleCancel(o)}
            >
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
          <span
            className={connected ? 'live-status live-on' : 'live-status'}
            title={connected ? 'Order status updates live' : 'Live updates reconnecting - refreshing periodically'}
          >
            {connected ? 'Live' : 'Reconnecting…'}
          </span>
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

      {successMessage && <div className="result result-success">{successMessage}</div>}
      {actionError && <div className="error">{actionError}</div>}
      <Loader show={firstLoad || cancellingId !== null} label={cancellingId !== null ? 'Cancelling order…' : 'Loading orders…'} />
      <AsyncState
        loading={loading && !firstLoad}
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
          <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={filteredOrders.length} pageSize={PAGE_SIZE} />
        </>
      )}
      {editTarget && (
        <EditOrderModal
          order={editTarget}
          products={stockData?.data || []}
          productsLoading={stockLoading && !stockData}
          productsError={stockData ? null : stockError}
          onRetryProducts={refetchStock}
          onClose={() => setEditTarget(null)}
          onSaved={handleEdited}
          onChanged={() => {
            refetch();
            refetchStock();
          }}
        />
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
