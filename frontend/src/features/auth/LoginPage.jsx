import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import Ripple from '../../components/common/Ripple';
import AuthLayout from './AuthLayout';
import './Auth.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const from = location.state?.from?.pathname || '/';

  const validate = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Email không đúng định dạng';
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password, rememberMe);
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Đăng nhập không thành công');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card-inner">
        <header className="auth-form-header">
          <h2 className="auth-heading">Đăng nhập</h2>
        </header>

        {errorMessage && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle size={18} className="auth-error-icon" />
            <span className="auth-error-text">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field-group">
            <label className="auth-label" htmlFor="login-email">
              Email
            </label>
            <div className={`auth-input-container ${fieldErrors.email ? 'has-error' : ''}`}>
              <input
                id="login-email"
                type="email"
                className="auth-text-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                }}
                autoComplete="email"
                disabled={submitting}
              />
            </div>
            {fieldErrors.email && <p className="auth-field-error">{fieldErrors.email}</p>}
          </div>

          <div className="auth-field-group">
            <label className="auth-label" htmlFor="login-password">
              Mật khẩu
            </label>
            <div className={`auth-input-container auth-password-container ${fieldErrors.password ? 'has-error' : ''}`}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-text-input auth-password-input"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
                autoComplete="current-password"
                disabled={submitting}
              />
              <button
                type="button"
                className="auth-password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && <p className="auth-field-error">{fieldErrors.password}</p>}
          </div>

          <div className="auth-remember-row">
            <label className="auth-remember-label" htmlFor="login-remember-me">
              <input
                id="login-remember-me"
                type="checkbox"
                className="auth-remember-checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={submitting}
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
          </div>

          <button
            type="submit"
            className="auth-primary-btn"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Ripple size={18} color="currentColor" />
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>
        </form>

        <footer className="auth-footer">
          <p className="auth-footer-prompt">
            Chưa có tài khoản?{' '}
            <Link to="/register" state={{ from: location.state?.from }} className="auth-action-link">
              Đăng ký
            </Link>
          </p>
        </footer>
      </div>
    </AuthLayout>
  );
}
