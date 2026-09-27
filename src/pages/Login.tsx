import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import { AlertIcon, PackageIcon } from '../components/Icons';

interface LoginProps {
  infoMessage: string | null;
  onForgotPassword: (email: string) => void;
}

export default function Login({ infoMessage, onForgotPassword }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
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
          <h2>Log in</h2>
          <p className="hint">Sign in to the MAP Ordering Portal.</p>
        </div>
        {infoMessage && (
          <div className="result result-success" role="status">
            {infoMessage}
          </div>
        )}
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              autoFocus
            />
          </label>
          <label>
            Password
            <PasswordInput
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <div className="error" role="alert">
              <AlertIcon size={18} />
              <span>{error}</span>
            </div>
          )}
          <button type="submit" className="btn-primary btn-block" disabled={submitting}>
            {submitting && <span className="spinner-btn" />}
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <button type="button" className="link-btn auth-forgot-link" onClick={() => onForgotPassword(email)}>
          Forgot / Reset Password
        </button>
      </div>
    </div>
  );
}
