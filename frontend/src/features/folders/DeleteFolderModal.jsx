import { useState } from 'react';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { AlertTriangle } from 'lucide-react';

export default function DeleteFolderModal({
  isOpen,
  onClose,
  folder,
  onConfirm,
  loading = false,
}) {
  const [deleteMode, setDeleteMode] = useState('setNull'); // 'setNull' | 'deleteDecks'

  if (!folder) return null;

  const deckCount = folder.deckCount || 0;

  const handleConfirm = () => {
    onConfirm(folder.id, deleteMode);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xóa thư mục"
      maxWidth="480px"
    >
      <div className="delete-folder-modal-content">
        <div className="dialog-alert-box">
          <AlertTriangle size={24} className="text-warning" />
          <div>
            Bạn có chắc chắn muốn xóa thư mục <strong>"{folder.name}"</strong>?
            {deckCount > 0 ? (
              <p style={{ marginTop: '6px', color: '#4b5563', fontSize: '14px' }}>
                Thư mục này hiện đang chứa <strong>{deckCount}</strong> bộ từ vựng. Vui lòng chọn cách xử lý:
              </p>
            ) : (
              <p style={{ marginTop: '6px', color: '#6b7280', fontSize: '14px' }}>
                Thư mục này trống, việc xóa sẽ không ảnh hưởng đến bộ từ vựng nào.
              </p>
            )}
          </div>
        </div>

        {deckCount > 0 && (
          <div className="delete-options" style={{ margin: '16px 0' }}>
            <label className="radio-card">
              <input
                type="radio"
                name="deleteMode"
                value="setNull"
                checked={deleteMode === 'setNull'}
                onChange={() => setDeleteMode('setNull')}
              />
              <div className="radio-label">
                <strong>Chuyển vào "Chưa phân loại" (Khuyên dùng)</strong>
                <span>Giữ lại tất cả {deckCount} bộ từ vựng và đưa về danh sách Chưa phân loại.</span>
              </div>
            </label>

            <label className="radio-card radio-danger">
              <input
                type="radio"
                name="deleteMode"
                value="deleteDecks"
                checked={deleteMode === 'deleteDecks'}
                onChange={() => setDeleteMode('deleteDecks')}
              />
              <div className="radio-label">
                <strong className="text-danger">Xóa luôn {deckCount} bộ từ vựng bên trong</strong>
                <span className="text-danger">Cảnh báo: Toàn bộ {deckCount} bộ từ vựng và các thẻ từ bên trong sẽ bị xóa vĩnh viễn!</span>
              </div>
            </label>
          </div>
        )}

        <div className="modal-footer" style={{ marginTop: '20px' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Hủy bỏ
          </Button>
          <Button
            variant={deleteMode === 'deleteDecks' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Đang xóa...' : 'Xác nhận xóa'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
