import { useEffect, useState } from 'react';
import { getStockBySkus } from '../services/api';
import type { StockRow } from '../types';

// The catalog rows (image, price, live stock) for a handful of SKUs, keyed by SKU - what the
// order screens need for the items of ONE order, fetched with the `sku` filter instead of the
// whole catalog. `skus` may be a new array on every render; only its content matters.
export function useSkuProducts(skus: (string | null | undefined)[] | undefined): Record<string, StockRow> {
  const key = [...new Set((skus || []).filter(Boolean))].sort().join(',');
  const [state, setState] = useState<{ key: string; bySku: Record<string, StockRow> }>({ key: '', bySku: {} });

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    getStockBySkus(key.split(','))
      .then((rows) => {
        if (active) setState({ key, bySku: Object.fromEntries(rows.map((row) => [row.sku as string, row])) });
      })
      .catch(() => {
        // Images are decoration here - a failed lookup just leaves the placeholders.
      });
    return () => {
      active = false;
    };
  }, [key]);

  return state.key === key ? state.bySku : {};
}
