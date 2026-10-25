import { useState, useEffect } from 'react';
import {
  Sparkles,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import Modal from './Modal';
import { getGeminiApiKey, setGeminiApiKey, removeGeminiApiKey } from '../../utils/aiKeyStorage';
import { request } from '../../services/api';
import './GeminiKeyModal.css';

export default function GeminiKeyModal({
  isOpen,
  onClose,
  onSuccess,
  onToast,
}) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', text: '' }

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      const existing = getGeminiApiKey();
      setApiKey(existing);
      setStatus(
        existing
          ? { type: 'success', text: 'Đã cấu hình API Key cá nhân trong trình duyệt.' }
          : null
      );
    }
  }, [isOpen]);

  const handleTestAndSave = async (e) => {
    e?.preventDefault();
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      setStatus({ type: 'error', text: 'Vui lòng nhập API Key để kiểm tra.' });
      return;
    }

    setTesting(true);
    setStatus(null);

    try {
      const res = await request('/ai/test-key', {
        method: 'POST',
        body: JSON.stringify({ apiKey: cleanKey }),
      });

      setGeminiApiKey(cleanKey);
      setStatus({
        type: 'success',
        text: res?.message || 'Kết nối thành công với Google Gemini 1.5 Flash!',
      });
      onToast?.('Đã lưu Gemini API Key cá nhân thành công!', 'success');
      onSuccess?.();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setStatus({
        type: 'error',
        text: err.message || 'API Key không hợp lệ. Vui lòng kiểm tra lại trên Google AI Studio.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleRemoveKey = () => {
    removeGeminiApiKey();
    setApiKey('');
    setStatus(null);
    onToast?.('Đã xóa Gemini API Key.', 'info');
    onSuccess?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cấu hình Google Gemini AI Cá nhân"
      maxWidth="560px"
    >
      <div className="gemini-modal-content">
        {/* Banner info */}
        <div className="gemini-info-card">
          <div className="gemini-info-icon-wrap">
            <Sparkles size={22} className="gemini-sparkle-gold" />
          </div>
          <div className="gemini-info-text">
            <h4>Mô hình BYOK (Tự nạp API Key cá nhân)</h4>
            <p>
              Google cung cấp gói <strong>miễn phí 100%</strong> với hàng triệu tokens mỗi tháng. 
              Bạn chỉ cần nạp key cá nhân một lần để kích hoạt tính năng đặt câu và chấm điểm AI không giới hạn.
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="gemini-security-badge">
          <ShieldCheck size={16} />
          <span>Key được lưu an toàn trên trình duyệt (LocalStorage) của bạn và không lưu vào CSDL máy chủ.</span>
        </div>

        {/* Guide link */}
        <div className="gemini-guide-row">
          <span>Chưa có key? Lấy miễn phí trong 30 giây:</span>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="gemini-studio-link"
          >
            <span>Google AI Studio</span>
            <ExternalLink size={13} />
          </a>
        </div>

        {/* Form */}
        <form onSubmit={handleTestAndSave} className="gemini-key-form">
          <label htmlFor="gemini-key-input" className="gemini-input-label">
            <Key size={14} />
            <span>Google Gemini API Key:</span>
          </label>

          <div className="gemini-input-wrapper">
            <input
              id="gemini-key-input"
              type={showKey ? 'text' : 'password'}
              className="gemini-key-input"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={testing}
              autoComplete="off"
              spellCheck="false"
            />
            <button
              type="button"
              className="gemini-toggle-vis-btn"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? 'Ẩn key' : 'Hiện key'}
              tabIndex={-1}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Status Message */}
          {status && (
            <div className={`gemini-status-alert is-${status.type}`}>
              {status.type === 'success' ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              <span>{status.text}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="gemini-modal-actions">
            {getGeminiApiKey() && (
              <button
                type="button"
                className="gemini-remove-btn"
                onClick={handleRemoveKey}
                disabled={testing}
                title="Xóa key đã lưu"
              >
                <Trash2 size={15} />
                <span>Xóa key</span>
              </button>
            )}

            <div className="gemini-actions-right">
              <button
                type="button"
                className="gemini-cancel-btn"
                onClick={onClose}
                disabled={testing}
              >
                Đóng
              </button>
              <button
                type="submit"
                className="gemini-save-btn"
                disabled={testing || !apiKey.trim()}
              >
                {testing ? (
                  <>
                    <RefreshCw size={15} className="gemini-spinner" />
                    <span>Đang kiểm tra...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Kiểm tra & Lưu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}
