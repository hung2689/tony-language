import { useState, useEffect } from 'react';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function CreateFolderModal({
  isOpen,
  onClose,
  onSubmit,
  folderToEdit = null,
  loading = false,
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (folderToEdit) {
      setName(folderToEdit.name || '');
    } else {
      setName('');
    }
    setError('');
  }, [folderToEdit, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Tên thư mục không được để trống');
      return;
    }
    if (trimmed.length > 100) {
      setError('Tên thư mục tối đa 100 ký tự');
      return;
    }

    onSubmit(trimmed);
  };

  const isEditing = Boolean(folderToEdit);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Đổi tên thư mục' : 'Tạo thư mục mới'}
      maxWidth="460px"
    >
      <form onSubmit={handleSubmit}>
        <Input
          label="Tên thư mục"
          required
          placeholder="Ví dụ: TOEIC, IELTS, Giao tiếp..."
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError('');
          }}
          error={error}
          autoFocus
        />

        <div className="modal-footer" style={{ marginTop: '20px' }}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Hủy bỏ
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo thư mục'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
