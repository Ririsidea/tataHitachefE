import { useState } from 'react';
import { resetPassword } from '../services/api';
import PasswordInput from '../components/PasswordInput';
import { AlertIcon, PackageIcon } from '../components/Icons';

// Client-side mirror of the backend policy in src/utils/passwordPolicy.js on the
// API side - this is only for fast feedback; the backend's check is the real one.
function checkPolicy(password) {
  if (password.length < 7) return 'Password must be at least 7 characters long';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

export default function ResetPassword({ initialEmail = '', onBackToLogin, onDone }) {
  const [email, setEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const policyError = checkPolicy(newPassword);
    if (policyError) {
      setError(policyError);
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(email, newPassword);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-logo" aria-hidden="true">
            <PackageIcon size={22} />
          </span>
          <span className="auth-wordmark">TATA HITACHI</span>
        </div>
        <div className="auth-heading">
          <h2>Reset password</h2>
          <p className="hint">Choose a new password for your account.</p>
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            New password
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Confirm new password
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          <p className="hint">
            Must be 7+ characters with at least one letter, one number, and one special character.
          </p>
          {error && (
            <div className="error" role="alert">
              <AlertIcon size={18} />
              <span>{error}</span>
            </div>
          )}
          <div className="auth-form-actions">
            <button type="button" className="btn-ghost" onClick={onBackToLogin} disabled={submitting}>
              Back to login
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting && <span className="spinner-btn" />}
              {submitting ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
