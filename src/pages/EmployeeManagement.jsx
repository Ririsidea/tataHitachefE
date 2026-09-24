import { useEffect, useMemo, useState } from 'react';
import { listEmployees, addEmployee, deleteEmployee } from '../services/api';
import { useAsyncData } from '../hooks/useAsyncData';
import AsyncState from '../components/AsyncState';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import PasswordInput from '../components/PasswordInput';
import SearchInput from '../components/SearchInput';
import { CloseIcon } from '../components/Icons';

const PAGE_SIZE = 10;

// Client-side mirror of the backend policy in src/utils/passwordPolicy.js - this is
// only for fast feedback; the backend's check is the one that's actually enforced.
function checkPolicy(password) {
  if (password.length < 7) return 'Password must be at least 7 characters long';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

function AddEmployeeModal({ onClose, onAdded }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e) => {
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
      setFormError(err.message);
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
                onChange={(e) => setPassword(e.target.value)}
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
  const { data, loading, error, refetch } = useAsyncData(listEmployees);
  const employees = data?.data || [];

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter(
      (u) => (u.name || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query)
    );
  }, [employees, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleAdded = () => {
    setShowAddModal(false);
    setSearch('');
    setPage(1);
    refetch();
  };

  const handleDelete = async (employee) => {
    if (!window.confirm(`Remove ${employee.name || employee.email}? This cannot be undone.`)) return;
    setActionError(null);
    setDeletingId(employee.id);
    try {
      await deleteEmployee(employee.id);
      refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
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
        loading={loading}
        error={error}
        isEmpty={employees.length === 0}
        emptyLabel="No employees yet."
      />
      {!loading && !error && employees.length > 0 && (
        <>
          <SearchInput value={search} onChange={handleSearchChange} placeholder="Search employees by name or email" />
          <AsyncState loading={false} error={null} isEmpty={filtered.length === 0} emptyLabel="No employees match your search." />
          {pageItems.length > 0 && (
            <>
              <DataTable columns={columns} rows={pageItems} rowKey={(u) => u.id} />
              <Pagination page={page} totalPages={totalPages} onChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
            </>
          )}
        </>
      )}

      {showAddModal && <AddEmployeeModal onClose={() => setShowAddModal(false)} onAdded={handleAdded} />}
    </div>
  );
}
