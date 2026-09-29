import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createMapOrder, getPincode, validateMapAddress } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { AlertIcon } from '../components/Icons';
import Loader from '../components/Loader';
import type { Order, PincodeInfo } from '../types';

const PHONE_PATTERN = /^[0-9]{10}$/;
const ZIP_PATTERN = /^[1-9][0-9]{5}$/;

interface CheckoutProps {
  onBack: () => void;
  onOrderPlaced: (order: Order) => void;
}

export default function Checkout({ onBack, onOrderPlaced }: CheckoutProps) {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [address1, setAddress1] = useState('');
  const [zip, setZip] = useState('');
  const [pincodeInfo, setPincodeInfo] = useState<PincodeInfo | null>(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const country = 'India';
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const requestToken = useRef(0);

  // PIN-first: a well-formed PIN looks up its state, district and the exact list of city
  // names the backend will accept for it (services/pincode.service.ts) - state is then
  // read-only and the city field is a dropdown built from that same list, so what the
  // customer can select here is guaranteed to pass validate-address / create-order.
  useEffect(() => {
    setCity('');
    if (!ZIP_PATTERN.test(zip)) {
      setPincodeInfo(null);
      setPincodeError(null);
      return undefined;
    }
    const token = ++requestToken.current;
    setPincodeLoading(true);
    setPincodeError(null);
    getPincode(zip)
      .then((res) => {
        if (requestToken.current !== token) return;
        setPincodeInfo(res.data);
      })
      .catch((err: Error) => {
        if (requestToken.current !== token) return;
        setPincodeInfo(null);
        setPincodeError(err.message);
      })
      .finally(() => {
        if (requestToken.current === token) setPincodeLoading(false);
      });
    return undefined;
  }, [zip]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setAddressError(null);

    if (!PHONE_PATTERN.test(phone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    if (!pincodeInfo) {
      setAddressError('Enter a valid PIN code');
      return;
    }
    if (!city) {
      setAddressError('Select a city');
      return;
    }

    setSubmitting(true);
    try {
      await validateMapAddress({ country, state: pincodeInfo.state, city, pincode: zip });
      const res = await createMapOrder({
        // identity comes from the logged-in profile (the route is authenticated by the API key)
        name: user?.name,
        email: user?.email,
        phone,
        items: items.map(({ sku, quantity }) => ({ sku, quantity })),
        shippingAddress: { address1, city, province: pincodeInfo.state, zip, country },
      });
      clearCart();
      onOrderPlaced(res.data);
    } catch (err) {
      setAddressError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel">
      <Loader show={submitting} label="Placing your order…" />
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
            <label>
              Postal Code
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit PIN code"
                inputMode="numeric"
                autoComplete="postal-code"
                required
              />
              {pincodeLoading && <span className="hint">Looking up PIN code…</span>}
              {pincodeError && <span className="field-error">{pincodeError}</span>}
            </label>
            <label>
              State / Province
              <input value={pincodeInfo?.state || ''} placeholder="From the PIN code" readOnly />
            </label>
            <label>
              City
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setAddressError(null);
                }}
                autoComplete="address-level2"
                required
                disabled={!pincodeInfo}
              >
                <option value="" disabled>
                  {pincodeInfo ? 'Select a city' : 'Enter a valid PIN code first'}
                </option>
                {pincodeInfo?.cities.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>
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
              Country
              <input value={country} readOnly />
            </label>
          </div>
          {(error || addressError) && (
            <div className="error" role="alert">
              <AlertIcon size={18} />
              <span>{error || addressError}</span>
            </div>
          )}
          <div className="checkout-form-actions">
            <button type="button" className="btn-ghost" onClick={onBack} disabled={submitting}>
              Back to Cart
            </button>
            <button type="submit" className="btn-primary" disabled={submitting || items.length === 0 || !pincodeInfo || !city}>
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
                  {item.variantTitle ? `${item.title} (${item.variantTitle})` : item.title} × {item.quantity}
                </span>
              </span>
              <span>{formatCurrency(Number(item.price || 0) * item.quantity)}</span>
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
