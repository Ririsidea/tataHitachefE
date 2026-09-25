import { useMemo, useState } from 'react';
import { useStock } from '../hooks/useStock';
import AsyncState from '../components/AsyncState';
import Loader from '../components/Loader';
import DataTable from '../components/DataTable';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import { ImageIcon } from '../components/Icons';
import { formatCurrency } from '../utils/formatters';

const PAGE_SIZE = 10;

const COLUMNS = [
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
  { key: 'title', label: 'Title' },
  { key: 'category', label: 'Category', render: (p) => p.category || '—' },
  { key: 'price', label: 'Price', render: (p) => formatCurrency(p.price) },
  { key: 'availableQty', label: 'Available' },
];

export default function Products() {
  const { data, loading, error } = useStock();
  const products = data?.data || [];
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        (p.sku || '').toLowerCase().includes(query) ||
        (p.category || '').toLowerCase().includes(query)
    );
  }, [products, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="panel">
      <h2>Products / Stock</h2>
      <Loader show={loading} />
      <AsyncState
        loading={false}
        error={loading ? null : error}
        isEmpty={!loading && products.length === 0}
        emptyLabel="No products found in Shopify."
      />
      {!loading && !error && products.length > 0 && (
        <>
          <SearchInput value={search} onChange={handleSearchChange} placeholder="Search products by name, SKU or category" />
          <AsyncState loading={false} error={null} isEmpty={filtered.length === 0} emptyLabel="No products match your search." />
          {pageItems.length > 0 && <DataTable columns={COLUMNS} rows={pageItems} rowKey={(p) => p.id} />}
          <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
        </>
      )}
    </div>
  );
}
