import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, ShieldAlert } from 'lucide-react';
import { profileService } from '../profileService';
import { setAccessToken } from '../../../services/api';

export default function ChangePasswordForm({
  user,
  onSuccess,
  onError,
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Client validation
  const validateForm = () => {
    const errors = {};

    if (!currentPassword) {
      errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
    }

    if (!newPassword) {
      errors.newPassword = 'Vui lòng nhập mật khẩu mới.';
    } else {
      if (newPassword.length < 8) {
        errors.newPassword = 'Mật khẩu phải có ít nhất 8 ký tự.';
      } else if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        errors.newPassword = 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số.';
      } else {
        const byteLen = new TextEncoder().encode(newPassword).length;
        if (byteLen > 72) {
          errors.newPassword = 'Mật khẩu không được vượt quá 72 bytes.';
        }
      }

      if (user?.username && newPassword.toLowerCase() === user.username.toLowerCase()) {
        errors.newPassword = 'Mật khẩu mới không được trùng với tên đăng nhập.';
      }
      if (user?.email && newPassword.toLowerCase() === user.email.toLowerCase()) {
        errors.newPassword = 'Mật khẩu mới không được trùng với địa chỉ email.';
      }
      if (currentPassword && newPassword === currentPassword) {
        errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
      }
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.';
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Xác nhận mật khẩu không trùng khớp.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await profileService.changePassword({
        currentPassword,
        newPassword,
      });

      // Update fresh session access token
      if (res?.tokens?.accessToken) {
        setAccessToken(res.tokens.accessToken);
      }

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setValidationErrors({});

      if (onSuccess) {
        onSuccess('Đã đổi mật khẩu; các thiết bị khác cần đăng nhập lại');
      }
    } catch (err) {
      let msg = err.message || 'Lỗi khi đổi mật khẩu';
      if (err.status === 429 || msg.includes('429') || msg.toLowerCase().includes('thử lại sau')) {
        msg = 'Bạn đã nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau 15 phút.';
      }
      setFormError(msg);
      if (onError) onError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="profile-form-container">
      <div className="profile-section-card">
        <h3 className="profile-section-title">Đổi mật khẩu</h3>
        <p className="profile-section-desc">
          Sau khi đổi mật khẩu thành công, phiên đăng nhập trên các thiết bị khác sẽ tự động hết hiệu lực.
        </p>

        {formError && (
          <div className="profile-alert profile-alert-error" role="alert">
            <ShieldAlert size={18} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          {/* Current Password */}
          <div className="form-group">
            <label htmlFor="currentPassword" className="form-label">
              Mật khẩu hiện tại
            </label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                className={`form-input ${validationErrors.currentPassword ? 'input-error' : ''}`}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (validationErrors.currentPassword) {
                    setValidationErrors((v) => ({ ...v, currentPassword: '' }));
                  }
                }}
                placeholder="Nhập mật khẩu hiện tại"
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="input-trailing-action"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {validationErrors.currentPassword && (
              <span className="field-error-text">{validationErrors.currentPassword}</span>
            )}
          </div>

          {/* New Password */}
          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">
              Mật khẩu mới
            </label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                className={`form-input ${validationErrors.newPassword ? 'input-error' : ''}`}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (validationErrors.newPassword) {
                    setValidationErrors((v) => ({ ...v, newPassword: '' }));
                  }
                }}
                placeholder="Tối thiểu 8 ký tự (chữ và số)"
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="input-trailing-action"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {validationErrors.newPassword ? (
              <span className="field-error-text">{validationErrors.newPassword}</span>
            ) : (
              <span className="field-hint-text">
                Tối thiểu 8 ký tự, phải gồm ít nhất 1 chữ cái và 1 chữ số. Tối đa 72 bytes.
              </span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Xác nhận mật khẩu mới
            </label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                className={`form-input ${validationErrors.confirmPassword ? 'input-error' : ''}`}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (validationErrors.confirmPassword) {
                    setValidationErrors((v) => ({ ...v, confirmPassword: '' }));
                  }
                }}
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="input-trailing-action"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <span className="field-error-text">{validationErrors.confirmPassword}</span>
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-profile-primary"
              disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>Đổi mật khẩu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
