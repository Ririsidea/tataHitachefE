import { useMemo, useState } from 'react';
import { getStock } from '../services/api';
import { useAsyncData } from '../hooks/useAsyncData';
import AsyncState from '../components/AsyncState';
import DataTable from '../components/DataTable';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import { formatCurrency } from '../utils/formatters';

const PAGE_SIZE = 10;

const COLUMNS = [
  {
    key: 'image',
    label: '',
    render: (p) => (
      <div className="table-thumb">
        {p.imageUrl ? <img src={p.imageUrl} alt={p.title} /> : <div className="table-thumb-placeholder">No image</div>}
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
  const { data, loading, error } = useAsyncData(getStock);
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
      <AsyncState
        loading={loading}
        error={error}
        isEmpty={products.length === 0}
        emptyLabel="No products found in Shopify."
      />
      {!loading && !error && products.length > 0 && (
        <>
          <SearchInput value={search} onChange={handleSearchChange} placeholder="Search products by name, SKU or category" />
          <AsyncState loading={false} error={null} isEmpty={filtered.length === 0} emptyLabel="No products match your search." />
          {pageItems.length > 0 && <DataTable columns={COLUMNS} rows={pageItems} rowKey={(p) => p.id} />}
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
