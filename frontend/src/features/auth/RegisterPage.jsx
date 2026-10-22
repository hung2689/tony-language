import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Eye, EyeOff, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import AuthLayout from './AuthLayout';
import './Auth.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const from = location.state?.from?.pathname || '/';

  const validate = () => {
    const errors = {};
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    if (!trimmedEmail) {
      errors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Email không đúng định dạng';
    }

    if (!trimmedUsername) {
      errors.username = 'Vui lòng nhập tên đăng nhập';
    } else if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      errors.username = 'Tên đăng nhập phải từ 3 đến 30 ký tự';
    } else if (!/^[a-zA-Z0-9_.]+$/.test(trimmedUsername)) {
      errors.username = 'Chỉ được dùng chữ cái, chữ số, dấu gạch dưới và dấu chấm';
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 8) {
      errors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    } else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      errors.password = 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số';
    } else if (
      password.toLowerCase() === trimmedEmail.toLowerCase() ||
      password.toLowerCase() === trimmedUsername.toLowerCase()
    ) {
      errors.password = 'Mật khẩu không được trùng với email hoặc tên đăng nhập';
    }

    if (password && password !== confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
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
      await register(email.trim(), username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Đăng ký không thành công');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      badgeText="Bắt đầu học ngay hôm nay"
      brandQuote="Xây dựng nền tảng từ vựng vững chắc là bước đi ngắn nhất dẫn tới sự thành thạo."
    >
      <div className="auth-card-inner">
        <header className="auth-form-header">
          <span className="auth-step-pill">Tạo tài khoản</span>
          <h2 className="auth-heading">Đăng ký mới</h2>
          <p className="auth-subheading">Tham gia và bắt đầu xây dựng kho từ vựng cá nhân của bạn</p>
        </header>

        {errorMessage && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle size={18} className="auth-error-icon" />
            <span className="auth-error-text">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field-group">
            <label className="auth-label" htmlFor="reg-email">
              Địa chỉ Email <span className="auth-required-mark">*</span>
            </label>
            <div className={`auth-input-container ${fieldErrors.email ? 'has-error' : ''}`}>
              <input
                id="reg-email"
                type="email"
                className="auth-text-input"
                placeholder="tenban@example.com"
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
            <label className="auth-label" htmlFor="reg-username">
              Tên đăng nhập <span className="auth-required-mark">*</span>
            </label>
            <div className={`auth-input-container ${fieldErrors.username ? 'has-error' : ''}`}>
              <input
                id="reg-username"
                type="text"
                className="auth-text-input"
                placeholder="vd: hung_pham99 (3-30 ký tự)"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: '' }));
                }}
                autoComplete="username"
                disabled={submitting}
              />
            </div>
            {fieldErrors.username && <p className="auth-field-error">{fieldErrors.username}</p>}
          </div>

          <div className="auth-field-group">
            <label className="auth-label" htmlFor="reg-password">
              Mật khẩu <span className="auth-required-mark">*</span>
            </label>
            <div className={`auth-input-container auth-password-container ${fieldErrors.password ? 'has-error' : ''}`}>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-text-input auth-password-input"
                placeholder="Ít nhất 8 ký tự, gồm chữ và số"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
                autoComplete="new-password"
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

          <div className="auth-field-group">
            <label className="auth-label" htmlFor="reg-confirm-password">
              Xác nhận mật khẩu <span className="auth-required-mark">*</span>
            </label>
            <div className={`auth-input-container ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
              <input
                id="reg-confirm-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-text-input"
                placeholder="Nhập lại mật khẩu để xác nhận"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                autoComplete="new-password"
                disabled={submitting}
              />
            </div>
            {fieldErrors.confirmPassword && <p className="auth-field-error">{fieldErrors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            className="auth-primary-btn"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="auth-spinner" />
                <span>Đang khởi tạo tài khoản...</span>
              </>
            ) : (
              <>
                <span>Đăng ký tài khoản</span>
                <ArrowRight size={17} className="auth-btn-icon-right" />
              </>
            )}
          </button>
        </form>

        <footer className="auth-footer">
          <p className="auth-footer-prompt">
            Đã có tài khoản?{' '}
            <Link to="/login" state={{ from: location.state?.from }} className="auth-action-link">
              Đăng nhập ngay
            </Link>
          </p>
        </footer>
      </div>
    </AuthLayout>
  );
}
