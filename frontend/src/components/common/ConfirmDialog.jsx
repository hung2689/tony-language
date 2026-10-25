import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận hành động',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  confirmVariant = 'primary',
  loading = false,
  icon: CustomIcon,
  children,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      lockScroll();
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      if (isOpen) {
        unlockScroll();
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const IconComponent = CustomIcon || AlertTriangle;

  return (
    <div
      className="confirm-dialog-backdrop"
      onClick={!loading ? onClose : undefined}
      role="presentation"
    >
      <div
        className="confirm-dialog-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        {/* Header */}
        <div className="confirm-dialog-header">
          <div className="confirm-dialog-header-left">
            <div className="confirm-dialog-icon-circle">
              <IconComponent size={20} className="confirm-dialog-icon" />
            </div>
            <h2 id="confirm-dialog-title" className="confirm-dialog-title">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="confirm-dialog-close-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="confirm-dialog-content">
          {message && <p className="confirm-dialog-message">{message}</p>}
          {children}
        </div>

        {/* Footer Buttons */}
        <div className="confirm-dialog-footer">
          <button
            type="button"
            className="confirm-dialog-btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`confirm-dialog-btn-primary ${confirmVariant === 'danger' ? 'is-danger' : ''}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
