// The one cursor/URL implementation every list screen uses - see hooks/useCursor.ts (Orders,
// Employee Orders, Employee Management) and hooks/useCatalog.ts (Products, Shop). A URLSearchParams
// is never mutated in place here; every function returns a new one (or a new plain object).

export type CursorParams = { after?: string; before?: string };

export const nextParams = (c: string | null): CursorParams => (c ? { after: c } : {});
export const prevParams = (c: string | null): CursorParams => (c ? { before: c } : {});

// A URL carrying both after and before (hand-edited, a stale bookmark, or the old "Previous keeps
// the old after" bug) is invalid - treated as neither, i.e. the first page.
export function readCursor(sp: URLSearchParams): CursorParams {
  const after = sp.get('after')?.trim() || undefined;
  const before = sp.get('before')?.trim() || undefined;
  if (after && before) return {};
  return after ? { after } : before ? { before } : {};
}

// ALWAYS removes both first, then sets only what `c` carries - so after and before can never both
// land in the URL, however `sp` arrived (this is what fixes Previous leaving the old after behind).
export function writeCursor(sp: URLSearchParams, c: CursorParams): URLSearchParams {
  const n = new URLSearchParams(sp);
  n.delete('after');
  n.delete('before');
  if (c.after) n.set('after', c.after);
  if (c.before) n.set('before', c.before);
  return n;
}

export const cleanParams = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && String(v).trim() !== ''));
