import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import { AlertIcon, PackageIcon } from '../components/Icons';

interface LoginProps {
  infoMessage: string | null;
  onForgotPassword: (email: string) => void;
}

type LoginType = 'email' | 'employeeId';

export default function Login({ infoMessage, onForgotPassword }: LoginProps) {
  const { login } = useAuth();
  const [loginType, setLoginType] = useState<LoginType>('email');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(loginType === 'email' ? { loginType: 'email', email, password } : { loginType: 'employeeId', employeeId, password });
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
          <div className="login-type-toggle" role="radiogroup" aria-label="Log in with">
            <button
              type="button"
              role="radio"
              aria-checked={loginType === 'email'}
              className={`login-type-option${loginType === 'email' ? ' is-active' : ''}`}
              onClick={() => setLoginType('email')}
            >
              Email
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={loginType === 'employeeId'}
              className={`login-type-option${loginType === 'employeeId' ? ' is-active' : ''}`}
              onClick={() => setLoginType('employeeId')}
            >
              Employee ID
            </button>
          </div>
          {loginType === 'email' ? (
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
          ) : (
            <label>
              Employee ID
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="5-digit employee ID"
                inputMode="numeric"
                autoComplete="username"
                maxLength={5}
                required
                autoFocus
              />
            </label>
          )}
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
