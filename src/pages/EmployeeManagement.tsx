import { useEffect, useState, type FormEvent } from 'react';
import { listEmployees, addEmployee, deleteEmployee } from '../services/api';
import { usePagedList } from '../hooks/usePagedList';
import AsyncState from '../components/AsyncState';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import PasswordInput from '../components/PasswordInput';
import SearchInput from '../components/SearchInput';
import { CloseIcon } from '../components/Icons';
import type { DataColumn, Employee } from '../types';

const SEARCH_DEBOUNCE_MS = 300;

// Client-side mirror of the backend policy in src/utils/passwordPolicy.js - this is
// only for fast feedback; the backend's check is the one that's actually enforced.
function checkPolicy(password: string): string | null {
  if (password.length < 7) return 'Password must be at least 7 characters long';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

function AddEmployeeModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const policyError = checkPolicy(password);
    if (policyError) {
      setFormError(policyError);
      return;
    }

    setSubmitting(true);
    try {
      await addEmployee({ name: name.trim(), email: email.trim(), password });
      onAdded();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel modal-panel-narrow"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
        <div className="modal-form-body">
          <h2>Add Employee</h2>
          <form className="form" onSubmit={handleSubmit}>
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                autoFocus
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <PasswordInput
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                required
              />
            </label>
            <p className="hint">
              Must be 7+ characters with at least one letter, one number, and one special character.
            </p>
            {formError && <div className="error">{formError}</div>}
            <div className="auth-form-actions">
              <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting && <span className="spinner-btn" />}
                {submitting ? 'Adding...' : 'Add Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeManagement() {
  const [search, setSearch] = useState(''); // what is typed
  const [q, setQ] = useState(''); // what the list is filtered by (after the debounce)
  const [page, setPage] = useState(1);
  const { items: rows, meta, loading, error, refetch } = usePagedList(listEmployees, { page, q: q || undefined }, setPage);
  const employees = rows || [];
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<Employee['id'] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const term = search.trim();
    if (term === q) return undefined;
    const timer = setTimeout(() => {
      setQ(term);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, q]);

  const handleAdded = () => {
    setShowAddModal(false);
    setSearch('');
    setQ('');
    setPage(1);
    refetch();
  };

  const handleDelete = async (employee: Employee) => {
    if (!window.confirm(`Remove ${employee.name || employee.email}? This cannot be undone.`)) return;
    setActionError(null);
    setDeletingId(employee.id);
    try {
      await deleteEmployee(employee.id);
      refetch();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const columns: DataColumn<Employee>[] = [
    { key: 'name', label: 'Name', render: (u) => u.name || '—' },
    { key: 'email', label: 'Email' },
    {
      key: 'actions',
      label: '',
      render: (u) =>
        u.isAdmin ? (
          <Badge tone="info">Admin</Badge>
        ) : (
          <button
            type="button"
            className="btn-ghost btn-danger-ghost"
            disabled={deletingId === u.id}
            onClick={() => handleDelete(u)}
          >
            {deletingId === u.id && <span className="spinner-btn" />}
            {deletingId === u.id ? 'Removing...' : 'Remove'}
          </button>
        ),
    },
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Employee Management</h2>
        <button type="button" className="btn-primary" onClick={() => setShowAddModal(true)}>
          + Add Employee
        </button>
      </div>

      {actionError && <div className="error">{actionError}</div>}
      <AsyncState
        loading={loading && rows === null}
        error={error}
        isEmpty={!loading && !error && rows !== null && employees.length === 0 && !q}
        emptyLabel="No employees yet."
      />
      {!error && meta && (meta.total > 0 || q) && (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="Search employees by name or email" />
          <AsyncState loading={false} error={null} isEmpty={!loading && employees.length === 0} emptyLabel="No employees match your search." />
          {employees.length > 0 && (
            <>
              <DataTable columns={columns} rows={employees} rowKey={(u) => u.id} />
              <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} totalItems={meta.total} pageSize={meta.limit} />
            </>
          )}
        </>
      )}

      {showAddModal && <AddEmployeeModal onClose={() => setShowAddModal(false)} onAdded={handleAdded} />}
    </div>
  );
}
