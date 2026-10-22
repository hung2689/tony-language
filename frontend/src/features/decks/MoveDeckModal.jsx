import { useState, useEffect } from 'react';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';

export default function MoveDeckModal({
  isOpen,
  onClose,
  deck,
  folders = [],
  onConfirm,
  loading = false,
}) {
  const [selectedFolderId, setSelectedFolderId] = useState('');

  useEffect(() => {
    if (deck) {
      setSelectedFolderId(deck.folderId ? String(deck.folderId) : '');
    }
  }, [deck, isOpen]);

  if (!deck) return null;

  const handleConfirm = () => {
    const targetFolderId = selectedFolderId ? Number(selectedFolderId) : null;
    onConfirm(deck.id, targetFolderId);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chuyển thư mục"
      maxWidth="460px"
    >
      <div className="move-deck-modal-body">
        <p style={{ marginBottom: '16px', fontSize: '15px' }}>
          Chọn thư mục bạn muốn chuyển bộ từ <strong>"{deck.name}"</strong> tới:
        </p>

        <div className="form-group">
          <label className="form-label">Thư mục đích</label>
          <select
            className="form-select"
            value={selectedFolderId}
            onChange={(e) => setSelectedFolderId(e.target.value)}
          >
            <option value="">-- Chưa phân loại (Không có thư mục) --</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-footer" style={{ marginTop: '24px' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Hủy bỏ
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Đang chuyển...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
