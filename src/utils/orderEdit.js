// Pure logic behind the Edit Order modal: form state, stock limits, diff -> request body,
// validation and the human-readable summary. No React, no network - unit-tested in
// test/orderEdit.test.js.
//
// Shapes
//   detail (GET /api/map/orders/:id): { lineItems:[{sku,title,price,quantity,unfulfilledQuantity,locked}],
//            shippingAddress:{...}|null, phone, email, note }
//   form/baseline: { lines:[{key,sku,title,price,original,quantity,locked,isNew,removed}],
//            address:{...}, phone, email, note }
//   stockBySku: { [sku]: { availableQty, price, title, imageUrl } }  (from GET /api/map/stock)

export const ADDRESS_FIELDS = ['firstName', 'lastName', 'address1', 'address2', 'city', 'province', 'zip', 'country', 'phone'];
export const ADDRESS_LABELS = {
  firstName: 'First name', lastName: 'Last name', address1: 'Address line 1', address2: 'Address line 2',
  city: 'City', province: 'State', zip: 'PIN code', country: 'Country', phone: 'Address phone',
};
// address fields that Shopify needs to keep a usable address (never blank once changed)
const REQUIRED_ADDRESS_FIELDS = ['address1', 'city', 'province', 'zip', 'country'];

// Same rules as the backend (orderUpdate.service.js) so the UI never sends what it rejects.
const PIN_PATTERN = /^\d{6}$/;
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{4,19}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NOTE = 5000;

const str = (v) => (v === null || v === undefined ? '' : String(v));

export function stockMap(products = []) {
  const map = {};
  for (const p of products) {
    if (p && p.sku) map[p.sku] = { availableQty: Number(p.availableQty) || 0, price: p.price, title: p.title, imageUrl: p.imageUrl || null };
  }
  return map;
}

export function initForm(detail) {
  const a = detail.shippingAddress || {};
  return {
    lines: (detail.lineItems || []).map((li) => ({
      key: `orig-${li.sku}`,
      sku: li.sku,
      title: li.title,
      price: li.price === null || li.price === undefined ? null : Number(li.price),
      original: li.quantity,
      quantity: li.quantity,
      locked: Boolean(li.locked),
      lockedReason: li.lockedReason || null,
      isNew: false,
      removed: false,
    })),
    address: Object.fromEntries(ADDRESS_FIELDS.map((f) => [f, str(a[f])])),
    phone: str(detail.phone),
    email: str(detail.email),
    note: str(detail.note),
  };
}

export const cloneForm = (form) => JSON.parse(JSON.stringify(form));

// ---- stock limits ------------------------------------------------------------------
export function availableFor(sku, stock) {
  return stock[sku] ? stock[sku].availableQty : null; // null = SKU not in the stock list
}

// Highest quantity the UI allows for a line: an existing line may grow by what is in stock,
// a new line is capped at the stock. A locked (fulfilled) line cannot change at all.
export function maxQuantity(line, stock) {
  if (line.locked) return line.original;
  const available = availableFor(line.sku, stock);
  if (line.isNew) return Math.max(0, available ?? 0);
  return line.original + Math.max(0, available ?? 0);
}

export const activeLines = (lines) => lines.filter((l) => !l.removed && l.quantity > 0);

// The last remaining item cannot be removed (the backend refuses an empty order).
export function canRemove(line, lines) {
  if (line.locked || line.removed) return false;
  return activeLines(lines).length > 1;
}

export function setQuantity(lines, key, quantity, stock) {
  return lines.map((l) => {
    if (l.key !== key || l.locked) return l;
    const clamped = Math.min(Math.max(1, quantity), Math.max(1, maxQuantity(l, stock)));
    return { ...l, quantity: clamped };
  });
}

export function removeLine(lines, key) {
  const line = lines.find((l) => l.key === key);
  if (!line || !canRemove(line, lines)) return lines;
  // a line added in this session just disappears; an existing one is marked removed (undo-able)
  if (line.isNew) return lines.filter((l) => l.key !== key);
  return lines.map((l) => (l.key === key ? { ...l, removed: true } : l));
}

export function restoreLine(lines, key, stock) {
  return lines.map((l) => (l.key === key ? { ...l, removed: false, quantity: Math.min(l.original, Math.max(1, maxQuantity(l, stock))) } : l));
}

// Adds a searched product to the edited order and says what happened. A product that is already
// on the order never creates a second line: its quantity goes up by one (within the stock limit).
//   status: 'added' | 'increased' | 'restored' | 'max' | 'locked' | 'unavailable'
//   key:    the line that was touched (to highlight it). `lines` is returned as-is unless it changed.
export function addProductOutcome(lines, product, stock = {}) {
  const existing = lines.find((l) => l.sku === product.sku);
  if (existing) {
    // re-adding a line that was removed in this session brings the original line back
    if (existing.removed) {
      return { lines: lines.map((l) => (l.key === existing.key ? { ...l, removed: false, quantity: 1 } : l)), status: 'restored', key: existing.key };
    }
    if (existing.locked) return { lines, status: 'locked', key: existing.key };
    const next = Math.min(existing.quantity + 1, maxQuantity(existing, stock));
    if (next <= existing.quantity) return { lines, status: 'max', key: existing.key };
    return { lines: lines.map((l) => (l.key === existing.key ? { ...l, quantity: next } : l)), status: 'increased', key: existing.key };
  }
  if ((Number(product.availableQty) || 0) <= 0) return { lines, status: 'unavailable', key: null };
  const key = `new-${product.sku}`;
  return {
    lines: [
      ...lines,
      {
        key,
        sku: product.sku,
        title: product.title,
        price: product.price === undefined || product.price === null ? null : Number(product.price),
        original: 0,
        quantity: 1,
        locked: false,
        lockedReason: null,
        isNew: true,
        removed: false,
      },
    ],
    status: 'added',
    key,
  };
}

export const addProduct = (lines, product, stock = {}) => addProductOutcome(lines, product, stock).lines;

// Product search for the "Add product" box: every word of the query must match the product name
// or SKU. An empty query returns nothing (the catalogue is never listed by default). Products
// already on the order are included, flagged with their line, so searching one again bumps the
// existing line instead of looking like "no match". Best matches first.
export function searchProducts(products, lines, query, limit = 8) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return { results: [], total: 0 };
  const q = tokens.join(' ');
  const rank = (p) => {
    const sku = String(p.sku).toLowerCase();
    if (sku === q) return 0;
    if (sku.startsWith(q)) return 1;
    if (String(p.title || '').toLowerCase().startsWith(q)) return 2;
    return 3;
  };
  const matches = products
    .filter((p) => {
      if (!p || !p.sku) return false;
      const hay = `${String(p.title || '').toLowerCase()} ${String(p.sku).toLowerCase()}`;
      return tokens.every((t) => hay.includes(t));
    })
    .map((p) => ({ p, r: rank(p) }))
    .sort((a, b) => a.r - b.r || String(a.p.title).localeCompare(String(b.p.title)))
    .map(({ p }) => p);
  const results = matches.slice(0, limit).map((p) => ({ ...p, line: lines.find((l) => l.sku === p.sku && !l.removed) || null }));
  return { results, total: matches.length };
}

// Stock wording for the UI. `available` = units that can still be added (null = the SKU is not in
// the stock list, so nothing is claimed).
export const LOW_STOCK_AT = 5;
export function stockLabel(available) {
  if (available === null || available === undefined) return { tone: 'muted', text: 'Stock unknown' };
  if (available <= 0) return { tone: 'danger', text: 'Out of stock' };
  if (available <= LOW_STOCK_AT) return { tone: 'warning', text: `Only ${available} available` };
  return { tone: 'success', text: `In stock: ${available}` };
}

// ---- diff -> request body ------------------------------------------------------------
// Only what changed: absolute quantities per SKU (0 = removed), only the address fields that
// differ (the backend merges them into the current address), and phone/email/note if changed.
export function buildPayload(form, baseline) {
  const payload = {};

  const items = [];
  for (const line of form.lines) {
    if (line.isNew) {
      if (!line.removed) items.push({ sku: line.sku, quantity: line.quantity });
    } else if (line.removed) {
      items.push({ sku: line.sku, quantity: 0 });
    } else if (line.quantity !== line.original) {
      items.push({ sku: line.sku, quantity: line.quantity });
    }
  }
  if (items.length) payload.items = items;

  const address = {};
  for (const f of ADDRESS_FIELDS) {
    if (str(form.address[f]).trim() !== str(baseline.address[f]).trim()) address[f] = str(form.address[f]).trim();
  }
  if (Object.keys(address).length) payload.shippingAddress = address;

  if (form.phone.trim() !== baseline.phone.trim()) payload.phone = form.phone.trim();
  if (form.email.trim() !== baseline.email.trim()) payload.email = form.email.trim();
  if (form.note !== baseline.note) payload.note = form.note;

  return payload;
}

export const hasChanges = (payload) => Object.keys(payload).length > 0;

// ---- validation (changed fields only) ------------------------------------------------
// Returns { items?: string, address: {field: msg}, phone?, email?, note? }; empty = valid.
export function validateForm(form, baseline, stock) {
  const errors = { address: {} };
  const payload = buildPayload(form, baseline);

  for (const line of form.lines) {
    if (line.removed || line.locked) continue;
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      errors.items = `${line.sku}: quantity must be a whole number of at least 1`;
      break;
    }
    const max = maxQuantity(line, stock);
    if (line.quantity > max) {
      const available = availableFor(line.sku, stock);
      errors.items = `${line.sku}: only ${available ?? 0} more available in stock`;
      break;
    }
  }
  if (!errors.items && activeLines(form.lines).length === 0) {
    errors.items = 'The order must keep at least one item - use Cancel Order instead.';
  }

  if (payload.shippingAddress) {
    for (const [field, value] of Object.entries(payload.shippingAddress)) {
      if (REQUIRED_ADDRESS_FIELDS.includes(field) && !value) errors.address[field] = `${ADDRESS_LABELS[field]} is required`;
      else if (field === 'zip' && !PIN_PATTERN.test(value)) errors.address.zip = 'PIN code must be 6 digits';
      else if (field === 'phone' && value && !PHONE_PATTERN.test(value)) errors.address.phone = 'Enter a valid phone number (digits, optional leading +)';
    }
  }
  if (payload.phone !== undefined && !PHONE_PATTERN.test(payload.phone)) {
    errors.phone = 'Enter a valid phone number (digits, optional leading +), e.g. +919876543210';
  }
  if (payload.email !== undefined && !EMAIL_PATTERN.test(payload.email)) errors.email = 'Enter a valid email address';
  if (payload.note !== undefined && payload.note.length > MAX_NOTE) errors.note = `Note must be at most ${MAX_NOTE} characters`;

  return errors;
}

export const hasErrors = (errors) => Boolean(errors.items || errors.phone || errors.email || errors.note || Object.keys(errors.address).length);

// ---- summary -------------------------------------------------------------------------
export function describeChanges(form, baseline) {
  const lines = [];
  for (const l of form.lines) {
    if (l.isNew) {
      if (!l.removed) lines.push(`${l.sku}: added × ${l.quantity}`);
    } else if (l.removed) lines.push(`${l.sku}: removed (was ${l.original})`);
    else if (l.quantity !== l.original) lines.push(`${l.sku}: ${l.original} → ${l.quantity}`);
  }
  const changedAddress = ADDRESS_FIELDS.filter((f) => str(form.address[f]).trim() !== str(baseline.address[f]).trim());
  if (changedAddress.length) lines.push(`Shipping address changed (${changedAddress.map((f) => ADDRESS_LABELS[f].toLowerCase()).join(', ')})`);
  if (form.phone.trim() !== baseline.phone.trim()) lines.push(`Order phone: ${baseline.phone || '—'} → ${form.phone.trim()}`);
  if (form.email.trim() !== baseline.email.trim()) lines.push(`Order email: ${baseline.email || '—'} → ${form.email.trim()}`);
  if (form.note !== baseline.note) lines.push(form.note ? 'Note changed' : 'Note cleared');
  return lines;
}

// Rough change in the order value from the item edits (unit price × quantity delta).
// Lines whose price is unknown are ignored, so this is an estimate, not a quote.
export function estimatedTotalChange(form) {
  let delta = 0;
  for (const l of form.lines) {
    if (l.price === null || Number.isNaN(l.price)) continue;
    const now = l.removed ? 0 : l.quantity;
    delta += (now - l.original) * l.price;
  }
  return delta;
}

// Maps a failed/partial API call to the message the modal shows.
export function friendlyError(err) {
  switch (err.status) {
    case 401:
      return 'API key missing or invalid - check VITE_MAP_API_KEY in the frontend .env.';
    case 409:
    case 502:
    case 400:
    case 404:
      return err.message;
    default:
      return err.message || 'Something went wrong. Please try again.';
  }
}
