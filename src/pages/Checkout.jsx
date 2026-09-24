import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createMapOrder } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { INDIAN_STATES } from '../utils/indianStates';
import { AlertIcon } from '../components/Icons';

const PHONE_PATTERN = /^[0-9]{10}$/;

export default function Checkout({ onBack, onOrderPlaced }) {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [address1, setAddress1] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [zip, setZip] = useState('');
  const country = 'India';
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!PHONE_PATTERN.test(phone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createMapOrder({
        // identity comes from the logged-in profile (the route is authenticated by the API key)
        employeeName: user?.name,
        employeeEmail: user?.email,
        phone,
        items: items.map(({ sku, quantity }) => ({ sku, quantity })),
        shippingAddress: { address1, city, province, zip, country },
      });
      clearCart();
      onOrderPlaced(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel">
      <h2>Checkout</h2>
      <div className="checkout-layout">
        <form className="form checkout-form" onSubmit={handleSubmit}>
          <h3 className="form-section-title">Contact details</h3>
          <div className="form-grid">
            <label>
              Name
              <input value={user?.name || ''} readOnly />
            </label>
            <label>
              Email
              <input value={user?.email || ''} readOnly />
            </label>
            <label className="form-span-2">
              Mobile Number
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                inputMode="numeric"
                autoComplete="tel-national"
                required
              />
            </label>
          </div>
          <h3 className="form-section-title">Shipping address</h3>
          <div className="form-grid">
            <label className="form-span-2">
              Address
              <input
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                autoComplete="address-line1"
                required
                placeholder="Street address"
              />
            </label>
            <label>
              City
              <input value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" required />
            </label>
            <label>
              State / Province
              <select value={province} onChange={(e) => setProvince(e.target.value)} autoComplete="address-level1" required>
                <option value="" disabled>
                  Select a state
                </option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Postal Code
              <input value={zip} onChange={(e) => setZip(e.target.value)} inputMode="numeric" autoComplete="postal-code" required />
            </label>
            <label>
              Country
              <input value={country} readOnly />
            </label>
          </div>
          {error && (
            <div className="error" role="alert">
              <AlertIcon size={18} />
              <span>{error}</span>
            </div>
          )}
          <div className="checkout-form-actions">
            <button type="button" className="btn-ghost" onClick={onBack} disabled={submitting}>
              Back to Cart
            </button>
            <button type="submit" className="btn-primary" disabled={submitting || items.length === 0}>
              {submitting && <span className="spinner-btn" />}
              {submitting ? 'Placing order...' : 'Place Order'}
            </button>
          </div>
        </form>
        <aside className="order-summary checkout-summary">
          <h3>Order Summary</h3>
          {items.map((item) => (
            <div className="order-summary-row" key={item.sku}>
              <span className="order-summary-item">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="order-summary-thumb" loading="lazy" decoding="async" />
                ) : (
                  <span className="order-summary-thumb order-summary-thumb-placeholder" aria-hidden="true" />
                )}
                <span className="order-summary-name">
                  {item.title} × {item.quantity}
                </span>
              </span>
              <span>{formatCurrency((item.price || 0) * item.quantity)}</span>
            </div>
          ))}
          <div className="order-summary-total">
            <span>Total</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
