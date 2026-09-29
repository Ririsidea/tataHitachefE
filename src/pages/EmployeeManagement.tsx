import { useEffect, useState, type FormEvent } from 'react';
import { listEmployees, addEmployee, updateEmployee, deleteEmployee } from '../services/api';
import { usePagedList } from '../hooks/usePagedList';
import { useCursor } from '../hooks/useCursor';
import AsyncState from '../components/AsyncState';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import CursorPagination from '../components/CursorPagination';
import PasswordInput from '../components/PasswordInput';
import SearchInput from '../components/SearchInput';
import { CloseIcon } from '../components/Icons';
import type { DataColumn, Employee } from '../types';

const SEARCH_DEBOUNCE_MS = 300;
const EMPLOYEE_ID_PATTERN = /^\d{5}$/;

// Client-side mirror of the backend policy in src/utils/passwordPolicy.js - this is
// only for fast feedback; the backend's check is the one that's actually enforced.
function checkPolicy(password: string): string | null {
  if (password.length < 7) return 'Password must be at least 7 characters long';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

function EmployeeIdField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label>
      Employee ID
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 5))}
        placeholder="5-digit employee ID"
        inputMode="numeric"
        maxLength={5}
        required
      />
    </label>
  );
}

function AddEmployeeModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');
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

    if (!EMPLOYEE_ID_PATTERN.test(employeeId)) {
      setFormError('Employee ID must be exactly 5 digits');
      return;
    }
    const policyError = checkPolicy(password);
    if (policyError) {
      setFormError(policyError);
      return;
    }

    setSubmitting(true);
    try {
      await addEmployee({ name: name.trim(), email: email.trim(), employeeId, phone: phone.trim() || undefined, password });
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
            <EmployeeIdField value={employeeId} onChange={setEmployeeId} />
            <label>
              Phone (optional)
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
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

// name/email/employeeId/phone/newPassword together, one Save -> one PUT with only what changed.
function EditEmployeeModal({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee;
  onClose: () => void;
  onSaved: (passwordChanged: boolean) => void;
}) {
  const [name, setName] = useState(employee.name || '');
  const [email, setEmail] = useState(employee.email);
  const [employeeId, setEmployeeId] = useState(employee.employeeId);
  const [phone, setPhone] = useState(employee.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
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

    if (!EMPLOYEE_ID_PATTERN.test(employeeId)) {
      setFormError('Employee ID must be exactly 5 digits');
      return;
    }
    if (newPassword || confirmNewPassword) {
      const policyError = checkPolicy(newPassword);
      if (policyError) {
        setFormError(policyError);
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setFormError('New password and confirmation do not match');
        return;
      }
    }

    const payload: { name?: string; email?: string; employeeId?: string; phone?: string; newPassword?: string } = {};
    const trimmedName = name.trim();
    if (trimmedName !== (employee.name || '')) payload.name = trimmedName;
    const trimmedEmail = email.trim();
    if (trimmedEmail !== employee.email) payload.email = trimmedEmail;
    if (employeeId !== employee.employeeId) payload.employeeId = employeeId;
    const trimmedPhone = phone.trim();
    if (trimmedPhone !== (employee.phone || '')) payload.phone = trimmedPhone;
    if (newPassword) payload.newPassword = newPassword;

    setSubmitting(true);
    try {
      const res = await updateEmployee(employee.id, payload);
      onSaved(res.passwordChanged);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel modal-panel-narrow" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
        <div className="modal-form-body">
          <h2>Edit Employee</h2>
          <form className="form" onSubmit={handleSubmit}>
            <label>
              Name
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required autoFocus />
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required disabled={employee.isAdmin} />
            </label>
            {employee.isAdmin && <p className="hint">The admin account's email cannot be changed.</p>}
            <EmployeeIdField value={employeeId} onChange={setEmployeeId} />
            <label>
              Phone (optional)
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
            </label>
            <label>
              New Password
              <PasswordInput value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
            </label>
            <label>
              Confirm New Password
              <PasswordInput value={confirmNewPassword} onChange={setConfirmNewPassword} autoComplete="new-password" />
            </label>
            <p className="hint">
              Leave blank to keep the current password. If set, must be 7+ characters with at least one letter, one number,
              and one special character.
            </p>
            {formError && <div className="error">{formError}</div>}
            <div className="auth-form-actions">
              <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting && <span className="spinner-btn" />}
                {submitting ? 'Saving...' : 'Save Changes'}
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
  const { cursor, setCursor, reset: resetCursor } = useCursor();
  const { items: rows, pageInfo, loading, error, refetch } = usePagedList(listEmployees, { ...cursor, q: q || undefined }, (previousCursor) =>
    setCursor({ before: previousCursor })
  );
  const employees = rows || [];
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<Employee['id'] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const term = search.trim();
    if (term === q) return undefined;
    const timer = setTimeout(() => {
      setQ(term);
      resetCursor();
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, q, resetCursor]);

  // Auto-dismiss the toast a few seconds after it's shown.
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleAdded = () => {
    setShowAddModal(false);
    setSearch('');
    setQ('');
    resetCursor();
    refetch();
  };

  const handleEdited = (passwordChanged: boolean) => {
    setEditingEmployee(null);
    setToast(passwordChanged ? 'Employee updated - password changed' : 'Employee updated');
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
    { key: 'employeeId', label: 'Employee ID' },
    {
      key: 'actions',
      label: '',
      render: (u) => (
        <div className="order-row-actions">
          {u.isAdmin && <Badge tone="info">Admin</Badge>}
          <button type="button" className="btn-ghost" onClick={() => setEditingEmployee(u)}>
            Edit
          </button>
          {!u.isAdmin && (
            <button
              type="button"
              className="btn-ghost btn-danger-ghost"
              disabled={deletingId === u.id}
              onClick={() => handleDelete(u)}
            >
              {deletingId === u.id && <span className="spinner-btn" />}
              {deletingId === u.id ? 'Removing...' : 'Remove'}
            </button>
          )}
        </div>
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

      {toast && <div className="toast-success" role="status">{toast}</div>}
      {actionError && <div className="error">{actionError}</div>}
      <AsyncState
        loading={loading && rows === null}
        error={error}
        isEmpty={!loading && !error && rows !== null && employees.length === 0 && !q}
        emptyLabel="No employees yet."
      />
      {!error && pageInfo && (pageInfo.total > 0 || q) && (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="Search employees by name, email or employee ID" />
          <AsyncState loading={false} error={null} isEmpty={!loading && employees.length === 0} emptyLabel="No employees match your search." />
          {employees.length > 0 && (
            <>
              <DataTable columns={columns} rows={employees} rowKey={(u) => u.id} />
              <CursorPagination pageInfo={pageInfo} onCursor={setCursor} />
            </>
          )}
        </>
      )}

      {showAddModal && <AddEmployeeModal onClose={() => setShowAddModal(false)} onAdded={handleAdded} />}
      {editingEmployee && (
        <EditEmployeeModal employee={editingEmployee} onClose={() => setEditingEmployee(null)} onSaved={handleEdited} />
      )}
    </div>
  );
}
