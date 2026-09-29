import { useCatalog } from '../hooks/useCatalog';
import CatalogToolbar from '../components/CatalogToolbar';
import CatalogResults from '../components/CatalogResults';
import DataTable from '../components/DataTable';
import CursorPagination from '../components/CursorPagination';
import { ImageIcon } from '../components/Icons';
import { formatCurrency } from '../utils/formatters';
import type { DataColumn, StockRow } from '../types';

const COLUMNS: DataColumn<StockRow>[] = [
  {
    key: 'image',
    label: '',
    render: (p) => (
      <div className="table-thumb">
        {p.imageUrl ? <img src={p.imageUrl} alt={p.title} loading="lazy" decoding="async" /> : <div className="table-thumb-placeholder" role="img" aria-label="No image">
            <ImageIcon size={18} />
          </div>}
      </div>
    ),
  },
  { key: 'sku', label: 'SKU', render: (p) => p.sku || '—' },
  {
    key: 'title',
    label: 'Title',
    render: (p) => (
      <>
        {p.title}
        {p.variantTitle && <span className="table-variant">{p.variantTitle}</span>}
      </>
    ),
  },
  { key: 'category', label: 'Category', render: (p) => p.category || '—' },
  { key: 'price', label: 'Price', render: (p) => formatCurrency(p.price) },
  { key: 'availableQty', label: 'Available' },
];

export default function Products() {
  const catalog = useCatalog();
  const { data, pageInfo } = catalog;

  return (
    <div className="panel">
      <h2>Products / Stock</h2>
      <CatalogToolbar catalog={catalog} placeholder="Search by name, SKU, size, color, category…" />
      <CatalogResults catalog={catalog}>
        <DataTable columns={COLUMNS} rows={data || []} rowKey={(p) => p.variantId} />
      </CatalogResults>
      {pageInfo && <CursorPagination pageInfo={pageInfo} onCursor={catalog.setCursor} />}
    </div>
  );
}
