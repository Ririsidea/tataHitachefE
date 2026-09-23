import { useState } from 'react';
import { exportDaily, BACKEND_ORIGIN } from '../services/api';
import AsyncState from '../components/AsyncState';

export default function SapExport() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await exportDaily();
      setStatus(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>SAP Export</h2>
      <p className="hint">
        Generates a CSV of all of your own orders (a separate, full nightly hand-off for every
        employee's orders also runs automatically via a daily cron job).
      </p>
      <button type="button" className="btn-primary" onClick={handleExport} disabled={loading}>
        {loading && <span className="spinner-btn" />}
        {loading ? 'Exporting...' : 'Export My Orders'}
      </button>
      <AsyncState loading={false} error={error} isEmpty={false} emptyLabel="" />
      {status && (
        <div className="result">
          <p>{status.message}</p>
          {status.downloadUrl && (
            <a href={`${BACKEND_ORIGIN}${status.downloadUrl}`} target="_blank" rel="noreferrer">
              Download {status.file}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
