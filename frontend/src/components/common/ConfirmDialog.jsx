import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận hành động',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  confirmVariant = 'danger',
  loading = false,
  children,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="450px">
      <div className="confirm-dialog-content">
        <div className="confirm-dialog-icon">
          <AlertTriangle size={32} className="text-warning" />
        </div>
        <div className="confirm-dialog-body">
          {message && <p className="confirm-dialog-message">{message}</p>}
          {children}
        </div>
      </div>
      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
          {loading ? 'Đang xử lý...' : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
