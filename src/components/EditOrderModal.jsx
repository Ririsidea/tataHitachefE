import { useEffect, useMemo, useRef, useState } from 'react';
import { getMapOrder, editMapOrder } from '../services/api';
import Spinner from './Spinner';
import QuantityStepper from './QuantityStepper';
import AddProductSearch from './AddProductSearch';
import ProductThumb from './ProductThumb';
import { formatCurrency } from '../utils/formatters';
import { INDIAN_STATES } from '../utils/indianStates';
import {
  ADDRESS_LABELS,
  activeLines,
  addProductOutcome,
  availableFor,
  buildPayload,
  canRemove,
  cloneForm,
  describeChanges,
  estimatedTotalChange,
  friendlyError,
  hasChanges,
  hasErrors,
  initForm,
  maxQuantity,
  removeLine,
  restoreLine,
  setQuantity,
  stockLabel,
  stockMap,
  validateForm,
} from '../utils/orderEdit';
import { CloseIcon, LockIcon } from './Icons';

const FLASH_MS = 1800;

// Full edit of an open order: item quantities, add/remove items, shipping address, phone,
// email and note. Everything goes out as ONE request to PUT /api/map/orders/:id carrying
// only the fields that changed (the x-api-key is added by the shared API client).
// The order's own items come from GET /api/map/orders/:id; products to add are searched in
// `products` (the stock list the Orders page already loaded) - nothing is listed until a search.
export default function EditOrderModal({ order, products, productsLoading = false, productsError = null, onRetryProducts, onClose, onSaved, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [step, setStep] = useState('edit'); // 'edit' | 'review'
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [partialWarning, setPartialWarning] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const [flashKey, setFlashKey] = useState(null); // line briefly highlighted after an add / duplicate add
  const submittingRef = useRef(false); // hard guard against a double submit
  const lineRefs = useRef({});
  const flashTimer = useRef(null);

  const stock = useMemo(() => stockMap(products), [products]);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getMapOrder(order.id);
      const initial = initForm(res.data);
      setDetail(res.data);
      setBaseline(initial);
      setForm(cloneForm(initial));
    } catch (err) {
      setLoadError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const payload = useMemo(() => (form && baseline ? buildPayload(form, baseline) : {}), [form, baseline]);
  const errors = useMemo(() => (form && baseline ? validateForm(form, baseline, stock) : { address: {} }), [form, baseline, stock]);
  const changed = hasChanges(payload);
  const summary = useMemo(() => (form && baseline ? describeChanges(form, baseline) : []), [form, baseline]);
  const totalDelta = useMemo(() => (form ? estimatedTotalChange(form) : 0), [form]);

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setSaveError(null);
    setPartialWarning(null);
  };
  const updateAddress = (field, value) => update({ address: { ...form.address, [field]: value } });
  const updateLines = (lines) => update({ lines });

  useEffect(() => () => clearTimeout(flashTimer.current), []);
  useEffect(() => {
    if (flashKey) lineRefs.current[flashKey]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [flashKey]);

  // Search result -> order line. A product already on the order bumps its existing line.
  const handleAddProduct = (product) => {
    const outcome = addProductOutcome(form.lines, product, stock);
    if (outcome.lines !== form.lines) updateLines(outcome.lines);
    if (outcome.key) {
      setFlashKey(outcome.key);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlashKey(null), FLASH_MS);
    }
    return { status: outcome.status, key: outcome.key, quantity: outcome.lines.find((l) => l.key === outcome.key)?.quantity };
  };

  const goReview = () => {
    setShowErrors(true);
    if (!changed || hasErrors(errors)) return;
    setStep('review');
  };

  const handleSave = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await editMapOrder(order.id, payload);
      if (res.partial) {
        // Items are committed in Shopify but the address/contact update was rejected.
        setPartialWarning(res.message);
        onChanged();
        await load();
        setStep('edit');
        setShowErrors(false);
      } else {
        onSaved(res.message || 'Order updated successfully');
      }
    } catch (err) {
      setSaveError(friendlyError(err));
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  const fieldError = (msg) => (showErrors && msg ? <span className="field-error">{msg}</span> : null);

  const title = `${detail && !detail.editable ? 'Order' : 'Update order'} ${order.shopifyOrderId || `#${order.id}`}`;

  return (
    <div className="modal-backdrop" onClick={saving ? undefined : onClose}>
      <div className="modal-panel modal-panel-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="modal-close-btn" onClick={onClose} disabled={saving} aria-label="Close">
          <CloseIcon />
        </button>
        <div className="modal-form-body edit-order-body">
          <h2>{title}</h2>

          {loading && (
            <div className="async-loading">
              <Spinner />
            </div>
          )}
          {loadError && (
            <>
              <div className="error">{loadError}</div>
              <div className="auth-form-actions">
                <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
                <button type="button" className="btn-primary" onClick={load}>Retry</button>
              </div>
            </>
          )}

          {!loading && !loadError && detail && !detail.editable && (
            <ReadOnlyView detail={detail} onClose={onClose} />
          )}

          {!loading && !loadError && detail && detail.editable && form && step === 'edit' && (
            <>
              {partialWarning && <div className="error edit-warning" role="alert">Items were updated, but address/contact were not updated: {partialWarning}</div>}

              <section className="edit-section">
                <h3>
                  Order items <span className="edit-count">{activeLines(form.lines).length}</span>
                </h3>
                <ul className="edit-items">
                  {form.lines.map((line) => {
                    const available = availableFor(line.sku, stock);
                    const max = maxQuantity(line, stock);
                    const removable = canRemove(line, form.lines);
                    const stockInfo = stockLabel(available);
                    const atMax = !line.removed && !line.locked && line.quantity >= max;
                    return (
                      <li
                        className={`edit-item${line.removed ? ' edit-item-removed' : ''}${flashKey === line.key ? ' edit-item-flash' : ''}`}
                        key={line.key}
                        ref={(el) => {
                          if (el) lineRefs.current[line.key] = el;
                          else delete lineRefs.current[line.key];
                        }}
                      >
                        <ProductThumb url={stock[line.sku]?.imageUrl} title={line.title} />
                        <div className="edit-line-info">
                          <span className="edit-line-title" title={line.title}>{line.title}</span>
                          <span className="edit-line-meta">
                            SKU: {line.sku}
                            {line.price !== null && ` · ${formatCurrency(line.price)} each`}
                          </span>
                          <span className="edit-line-tags">
                            {line.removed ? (
                              <span className="stock-tag stock-muted">Removed from order</span>
                            ) : (
                              <>
                                <span className={`stock-tag stock-${stockInfo.tone}`}>{stockInfo.text}</span>
                                {line.isNew && <span className="in-order-tag">New</span>}
                                {line.locked && <span className="in-order-tag"><LockIcon size={11} /> {line.lockedReason || 'Already fulfilled - cannot be changed'}</span>}
                              </>
                            )}
                          </span>
                        </div>
                        <div className="edit-line-controls">
                          {line.removed ? (
                            <button type="button" className="btn-ghost" onClick={() => updateLines(restoreLine(form.lines, line.key, stock))}>
                              Undo
                            </button>
                          ) : line.locked ? (
                            <span className="qty-value">Qty {line.quantity}</span>
                          ) : (
                            <>
                              <QuantityStepper
                                value={line.quantity}
                                min={removable ? 0 : 1}
                                max={Math.max(1, max)}
                                decreaseLabel={removable && line.quantity === 1 ? `Remove ${line.title}` : undefined}
                                onChange={(q) => updateLines(q < 1 ? removeLine(form.lines, line.key) : setQuantity(form.lines, line.key, q, stock))}
                              />
                              <button
                                type="button"
                                className="btn-remove"
                                disabled={!removable}
                                title={removable ? 'Remove this item' : 'An order must keep at least one item - use Cancel Order instead'}
                                onClick={() => updateLines(removeLine(form.lines, line.key))}
                                aria-label={`Remove ${line.title}`}
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                        {atMax && (
                          <span className="edit-line-hint">
                            {available === null ? 'Stock unknown - quantity cannot be increased.' : `Stock limit reached - at most ${max} can be ordered.`}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {activeLines(form.lines).length <= 1 && (
                  <p className="hint">This is the only item on the order - it cannot be removed. To remove everything, use <strong>Cancel Order</strong> instead.</p>
                )}
                {fieldError(errors.items)}

                <AddProductSearch
                  products={products}
                  lines={form.lines}
                  stock={stock}
                  loading={productsLoading}
                  error={productsError}
                  onRetry={onRetryProducts}
                  onAdd={handleAddProduct}
                />
              </section>

              <section className="edit-section">
                <h3>Shipping address</h3>
                <div className="edit-grid form">
                  {['firstName', 'lastName', 'address1', 'address2', 'city'].map((f) => (
                    <label key={f} className={f === 'address1' ? 'edit-span-2' : undefined}>
                      {ADDRESS_LABELS[f]}
                      <input value={form.address[f]} onChange={(e) => updateAddress(f, e.target.value)} />
                      {fieldError(errors.address[f])}
                    </label>
                  ))}
                  <label>
                    {ADDRESS_LABELS.province}
                    <select value={form.address.province} onChange={(e) => updateAddress('province', e.target.value)}>
                      {form.address.province && !INDIAN_STATES.includes(form.address.province) && (
                        <option value={form.address.province}>{form.address.province}</option>
                      )}
                      <option value="">Select a state</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {fieldError(errors.address.province)}
                  </label>
                  <label>
                    {ADDRESS_LABELS.zip}
                    <input
                      value={form.address.zip}
                      inputMode="numeric"
                      onChange={(e) => updateAddress('zip', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    {fieldError(errors.address.zip)}
                  </label>
                  <label>
                    {ADDRESS_LABELS.country}
                    <input value={form.address.country} onChange={(e) => updateAddress('country', e.target.value)} />
                    {fieldError(errors.address.country)}
                  </label>
                  <label>
                    {ADDRESS_LABELS.phone}
                    <input type="tel" value={form.address.phone} onChange={(e) => updateAddress('phone', e.target.value)} />
                    {fieldError(errors.address.phone)}
                  </label>
                </div>
              </section>

              <section className="edit-section">
                <h3>Contact & note</h3>
                <div className="edit-grid form">
                  <label>
                    Order phone
                    <input type="tel" value={form.phone} placeholder="+919876543210" onChange={(e) => update({ phone: e.target.value })} />
                    {fieldError(errors.phone)}
                  </label>
                  <label>
                    Order email
                    <input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} />
                    {fieldError(errors.email)}
                  </label>
                  <label className="edit-span-2">
                    Note
                    <textarea rows={3} value={form.note} onChange={(e) => update({ note: e.target.value })} />
                    {fieldError(errors.note)}
                  </label>
                </div>
              </section>

              <div className="auth-form-actions">
                <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
                <button type="button" className="btn-primary" disabled={!changed} onClick={goReview}>
                  Review changes
                </button>
              </div>
              {!changed && <p className="hint">Nothing changed yet.</p>}
            </>
          )}

          {!loading && !loadError && detail && detail.editable && form && step === 'review' && (
            <>
              <section className="edit-section">
                <h3>Review changes</h3>
                <ul className="edit-summary">
                  {summary.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="hint edit-payment-note">
                  The order total will change{totalDelta !== 0 && ` (about ${totalDelta > 0 ? '+' : '−'}${formatCurrency(Math.abs(totalDelta))} from the item changes)`}.
                  Payment and refunds are <strong>not</strong> handled automatically - any balance due or refund has to be settled separately in Shopify.
                </p>
              </section>
              {saveError && <div className="error" role="alert">{saveError}</div>}
              <div className="auth-form-actions">
                <button type="button" className="btn-ghost" onClick={() => { setStep('edit'); setSaveError(null); }} disabled={saving}>
                  Back to editing
                </button>
                <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving && <span className="spinner-btn" />}
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Fulfilled / cancelled / closed orders: show what the order looks like and why it is locked.
function ReadOnlyView({ detail, onClose }) {
  const a = detail.shippingAddress || {};
  return (
    <>
      <div className="result edit-readonly" role="status">Read-only: {detail.readOnlyReason}</div>
      <section className="edit-section">
        <h3>Items</h3>
        {detail.lineItems.map((li) => (
          <div className="edit-line" key={li.sku}>
            <div className="edit-line-info">
              <span className="product-row-title">{li.title}</span>
              <span className="product-row-sku">{li.sku} · Qty {li.quantity}</span>
            </div>
          </div>
        ))}
      </section>
      <section className="edit-section">
        <h3>Shipping address</h3>
        <p className="hint">
          {[a.firstName && `${a.firstName} ${a.lastName || ''}`.trim(), a.address1, a.address2, a.city, a.province, a.zip, a.country].filter(Boolean).join(', ') || '—'}
        </p>
      </section>
      <div className="auth-form-actions">
        <button type="button" className="btn-primary" onClick={onClose}>Close</button>
      </div>
    </>
  );
}
