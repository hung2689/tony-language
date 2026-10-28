import React, { useState, useEffect } from 'react';
import { User, Mail, AtSign, Loader2, Check } from 'lucide-react';
import AvatarUploader from './AvatarUploader';
import { profileService } from '../profileService';
import { useAuth } from '../../auth/AuthContext';

export default function PersonalInfoForm({
  profile,
  animated = true,
  onProfileUpdated,
  onSuccess,
  onError,
}) {
  const { updateUser, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (profile?.displayName !== undefined) {
      setDisplayName(profile.displayName);
    }
  }, [profile?.displayName]);

  // Validate display name
  const validateName = (name) => {
    const trimmed = (name || '').trim().normalize('NFC');
    if (!trimmed) {
      return 'Họ và tên không được để trống.';
    }
    if (trimmed.length > 50) {
      return 'Họ và tên tối đa 50 ký tự.';
    }
    // Check for control characters
    for (let i = 0; i < trimmed.length; i++) {
      const code = trimmed.charCodeAt(i);
      if (code < 32 || (code >= 127 && code <= 159)) {
        return 'Họ và tên không được chứa ký tự điều khiển.';
      }
    }
    return '';
  };

  const handleNameChange = (e) => {
    setDisplayName(e.target.value);
    if (nameError) setNameError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validateName(displayName);
    if (error) {
      setNameError(error);
      return;
    }

    try {
      setIsSaving(true);
      setNameError('');
      const normalized = displayName.trim().normalize('NFC');
      const res = await profileService.updateName(normalized);

      // Update auth context
      if (updateUser) {
        updateUser({ displayName: res.displayName });
      }
      if (refreshUser) {
        await refreshUser();
      }

      if (onProfileUpdated) {
        onProfileUpdated({ displayName: res.displayName });
      }
      if (onSuccess) {
        onSuccess('Đã cập nhật hồ sơ');
      }
    } catch (err) {
      const msg = err.message || 'Lỗi khi cập nhật họ và tên';
      setNameError(msg);
      if (onError) onError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (newUrl) => {
    if (onProfileUpdated) {
      onProfileUpdated({ avatarUrl: newUrl });
    }
  };

  return (
    <div className="profile-form-container">
      <div className="profile-section-card">
        <h3 className="profile-section-title">Ảnh đại diện</h3>
        <p className="profile-section-desc">
          Ảnh đại diện hiển thị cùng khung cấp bậc học viên của bạn.
        </p>
        <AvatarUploader
          avatarUrl={profile?.avatarUrl}
          tierId={profile?.tierId}
          displayName={displayName || profile?.username}
          animated={animated}
          onAvatarUpdated={handleAvatarChange}
          onSuccess={onSuccess}
          onError={onError}
        />
      </div>

      <div className="profile-section-card">
        <h3 className="profile-section-title">Thông tin tài khoản</h3>
        <p className="profile-section-desc">
          Quản lý tên hiển thị và thông tin định danh của bạn.
        </p>

        <form onSubmit={handleSubmit} className="profile-form">
          {/* Display Name Field */}
          <div className="form-group">
            <label htmlFor="displayName" className="form-label">
              Họ và tên
            </label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="displayName"
                type="text"
                className={`form-input ${nameError ? 'input-error' : ''}`}
                value={displayName}
                onChange={handleNameChange}
                placeholder="Nhập họ và tên..."
                maxLength={50}
                disabled={isSaving}
              />
            </div>
            {nameError ? (
              <span className="field-error-text">{nameError}</span>
            ) : (
              <span className="field-hint-text">Độ dài từ 1 đến 50 ký tự.</span>
            )}
          </div>

          {/* Readonly Username */}
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Tên đăng nhập
            </label>
            <div className="input-with-icon">
              <AtSign size={18} className="input-icon text-muted" />
              <input
                id="username"
                type="text"
                className="form-input input-readonly"
                value={profile?.username || ''}
                readOnly
                disabled
              />
            </div>
            <span className="field-hint-text">Tên đăng nhập không thể thay đổi.</span>
          </div>

          {/* Readonly Email */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Địa chỉ Email
            </label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon text-muted" />
              <input
                id="email"
                type="email"
                className="form-input input-readonly"
                value={profile?.email || ''}
                readOnly
                disabled
              />
            </div>
            <span className="field-hint-text">
              Tính năng thay đổi địa chỉ email hiện chưa khả dụng.
            </span>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-profile-primary"
              disabled={isSaving || !displayName.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
