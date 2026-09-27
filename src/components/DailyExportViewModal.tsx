import { useEffect, useState } from 'react';
import { viewDailyExport } from '../services/api';
import AsyncState from './AsyncState';
import { CloseIcon } from './Icons';
import type { DailyExportView } from '../types';

export default function DailyExportViewModal({ exportId, onClose }: { exportId: string | number; onClose: () => void }) {
  const [data, setData] = useState<DailyExportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    viewDailyExport(exportId)
      .then((res) => {
        if (active) setData(res.data);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [exportId]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel order-details-panel export-view-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="modal-close-btn no-print" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>

        <div className="order-details-body">
          <div className="panel-header no-print">
            <h2>
              Export — {data?.exportDate || ''} ({data?.orderCount ?? '…'} order{data?.orderCount === 1 ? '' : 's'})
            </h2>
            <button type="button" className="btn-ghost" onClick={() => window.print()} disabled={loading || !!error}>
              Print
            </button>
          </div>

          {loading && (
            <div className="modal-loading">
              <AsyncState loading error={null} isEmpty={false} emptyLabel="" />
            </div>
          )}
          {!loading && error && <div className="error">{error}</div>}
          {!loading && !error && data && data.rows.length === 0 && (
            <div className="empty">No orders in this export.</div>
          )}
          {!loading && !error && data && data.rows.length > 0 && (
            <div className="export-view-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {data.columns.map((col, i) => (
                      <th key={i}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci}>{cell ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
