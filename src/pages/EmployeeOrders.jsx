import { useEffect, useState } from 'react';
import { listDailyExports, deleteDailyExport, downloadDailyExportFile } from '../services/api';
import AsyncState from '../components/AsyncState';
import DataTable from '../components/DataTable';
import Pagination from '../components/Pagination';
import DailyExportViewModal from '../components/DailyExportViewModal';

const PAGE_SIZE = 10;

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatDate(value) {
  if (!value) return '—';
  // exportDate comes back as a plain 'YYYY-MM-DD' string - avoid new Date()
  // shifting it a day via local-timezone parsing of a bare date.
  const [y, m, d] = String(value).split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export default function EmployeeOrders() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [viewingId, setViewingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listDailyExports({ page, pageSize: PAGE_SIZE, from: fromDate || undefined, to: toDate || undefined })
      .then((res) => {
        if (!active) return;
        setItems(res.data.items);
        setTotalPages(res.data.totalPages);
        setTotal(res.data.total);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, fromDate, toDate, reloadToken]);

  const refetch = () => setReloadToken((t) => t + 1);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const handleDownload = async (record) => {
    setActionError(null);
    setDownloadingId(record.id);
    try {
      await downloadDailyExportFile(record.id, record.fileName);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete the export for ${formatDate(record.exportDate)}? This cannot be undone.`)) return;
    setActionError(null);
    setDeletingId(record.id);
    try {
      await deleteDailyExport(record.id);
      refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    { key: 'generatedAt', label: 'Export Date', render: (r) => formatDateTime(r.createdAt) },
    { key: 'exportDate', label: 'Order Date', render: (r) => formatDate(r.exportDate) },
    { key: 'orderCount', label: 'Order Count' },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="order-row-actions">
          <button type="button" className="btn-ghost" onClick={() => setViewingId(r.id)}>
            View
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={downloadingId === r.id}
            onClick={() => handleDownload(r)}
          >
            {downloadingId === r.id && <span className="spinner-btn" />}
            {downloadingId === r.id ? 'Downloading...' : 'Download'}
          </button>
          <button
            type="button"
            className="btn-ghost btn-danger-ghost"
            disabled={deletingId === r.id}
            onClick={() => handleDelete(r)}
          >
            {deletingId === r.id && <span className="spinner-btn" />}
            {deletingId === r.id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Employee Orders</h2>
        <span className="hint">{total} daily export{total === 1 ? '' : 's'}</span>
      </div>


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

      {actionError && <div className="error">{actionError}</div>}
      <AsyncState loading={loading} error={error} isEmpty={!loading && !error && items.length === 0} emptyLabel="No exports found for this range." />
      {!loading && !error && items.length > 0 && (
        <>
          <DataTable columns={columns} rows={items} rowKey={(r) => r.id} />
          <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={total} pageSize={PAGE_SIZE} />
        </>
      )}

      {viewingId && <DailyExportViewModal exportId={viewingId} onClose={() => setViewingId(null)} />}
    </div>
  );
}
