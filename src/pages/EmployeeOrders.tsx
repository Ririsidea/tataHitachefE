import { useState, type ChangeEvent } from 'react';
import { listDailyExports, deleteDailyExport, downloadDailyExportFile } from '../services/api';
import AsyncState from '../components/AsyncState';
import DataTable from '../components/DataTable';
import CursorPagination from '../components/CursorPagination';
import DailyExportViewModal from '../components/DailyExportViewModal';
import { usePagedList } from '../hooks/usePagedList';
import { useCursor } from '../hooks/useCursor';
import type { DailyExport, DataColumn } from '../types';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  // exportDate comes back as a plain 'YYYY-MM-DD' string - avoid new Date()
  // shifting it a day via local-timezone parsing of a bare date.
  const [y, m, d] = String(value).split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export default function EmployeeOrders() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const { cursor, setCursor, reset: resetCursor } = useCursor();
  const { items: rows, pageInfo, loading, error, refetch } = usePagedList(
    listDailyExports,
    { ...cursor, from: fromDate || undefined, to: toDate || undefined },
    (previousCursor) => setCursor({ before: previousCursor })
  );
  const items = rows || [];
  const total = pageInfo?.total ?? 0;

  const [viewingId, setViewingId] = useState<DailyExport['id'] | null>(null);
  const [downloadingId, setDownloadingId] = useState<DailyExport['id'] | null>(null);
  const [deletingId, setDeletingId] = useState<DailyExport['id'] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleFilterChange = (setter: (value: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    resetCursor();
  };

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    resetCursor();
  };

  const handleDownload = async (record: DailyExport) => {
    setActionError(null);
    setDownloadingId(record.id);
    try {
      await downloadDailyExportFile(record.id, record.fileName);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (record: DailyExport) => {
    if (!window.confirm(`Delete the export for ${formatDate(record.exportDate)}? This cannot be undone.`)) return;
    setActionError(null);
    setDeletingId(record.id);
    try {
      await deleteDailyExport(record.id);
      refetch();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const columns: DataColumn<DailyExport>[] = [
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
      <AsyncState loading={loading && rows === null} error={error} isEmpty={!loading && !error && rows !== null && items.length === 0} emptyLabel="No exports found for this range." />
      {!error && items.length > 0 && (
        <>
          <DataTable columns={columns} rows={items} rowKey={(r) => r.id} />
          {pageInfo && <CursorPagination pageInfo={pageInfo} onCursor={setCursor} />}
        </>
      )}

      {viewingId && <DailyExportViewModal exportId={viewingId} onClose={() => setViewingId(null)} />}
    </div>
  );
}
