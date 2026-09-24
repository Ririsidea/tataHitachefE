import { useEffect, useState } from 'react';
import { updateOrder } from '../services/api';
import { CloseIcon } from './Icons';

const PHONE_PATTERN = /^[0-9]{10}$/;

// Edits the contact number on one of the logged-in employee's own orders. Calls
// PUT /api/orders/:id with the employee's JWT (added by the shared axios client) -
// the MAP external API key is never available to, or sent from, the browser.
export default function OrderUpdateModal({ order, onClose, onUpdated }) {
  const [phone, setPhone] = useState(order.employeePhone || '');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  const unchanged = phone === (order.employeePhone || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!PHONE_PATTERN.test(phone)) {
      setFormError('Enter a valid 10-digit mobile number');
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateOrder(order.id, { employeePhone: phone });
      onUpdated(res.message || 'Order updated successfully');
    } catch (err) {
      setFormError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={submitting ? undefined : onClose}>
      <div
        className="modal-panel modal-panel-narrow"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close"
        >
          <CloseIcon />
        </button>
        <div className="modal-form-body">
          <h2>Update Order</h2>
          <form className="form" onSubmit={handleSubmit}>
            <label>
              Shopify Order ID
              <input value={order.shopifyOrderId || '—'} readOnly />
            </label>
            <label>
              Contact Mobile Number
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                inputMode="numeric"
                required
                autoFocus
              />
            </label>
            {formError && <div className="error">{formError}</div>}
            <div className="auth-form-actions">
              <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting || unchanged}>
                {submitting && <span className="spinner-btn" />}
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
