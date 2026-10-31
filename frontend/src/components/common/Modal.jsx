import { useEffect } from 'react';
import { X } from 'lucide-react';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  headerIcon,
  className = '',
  backdropClassName = '',
  children,
  maxWidth = '550px',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`modal-backdrop ${backdropClassName}`.trim()} onClick={onClose}>
      <div
        className={`modal-container ${className}`.trim()}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="modal-header-title-group">
            {headerIcon && <div className="modal-header-icon">{headerIcon}</div>}
            <div className="modal-header-text">
              <h3 className="modal-title">{title}</h3>
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
