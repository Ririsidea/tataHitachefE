import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createMapOrder } from '../services/api';
import { formatCurrency } from '../utils/formatters';

const PHONE_PATTERN = /^[0-9]{10}$/;

const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

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
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Name
            <input value={user?.name || ''} readOnly />
          </label>
          <label>
            Email
            <input value={user?.email || ''} readOnly />
          </label>
          <label>
            Mobile Number
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              inputMode="numeric"
              required
            />
          </label>
          <label>
            Address
            <input
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              required
              placeholder="Street address"
            />
          </label>
          <label>
            City
            <input value={city} onChange={(e) => setCity(e.target.value)} required />
          </label>
          <label>
            State / Province
            <select value={province} onChange={(e) => setProvince(e.target.value)} required>
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
            <input value={zip} onChange={(e) => setZip(e.target.value)} required />
          </label>
          <label>
            Country
            <input value={country} readOnly />
          </label>
          {error && <div className="error">{error}</div>}
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
        <div className="order-summary">
          <h3>Order Summary</h3>
          {items.map((item) => (
            <div className="order-summary-row" key={item.sku}>
              <span>
                {item.title} × {item.quantity}
              </span>
              <span>{formatCurrency((item.price || 0) * item.quantity)}</span>
            </div>
          ))}
          <div className="order-summary-total">
            <span>Total</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
