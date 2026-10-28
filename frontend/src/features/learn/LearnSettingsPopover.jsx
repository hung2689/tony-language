import { useEffect, useRef } from 'react';
import { X, Settings } from 'lucide-react';

export default function LearnSettingsPopover({
  isOpen,
  onClose,
  options,
  onOptionsChange,
}) {
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="vintage-settings-backdrop">
      <div className="vintage-settings-popover" ref={popoverRef} role="dialog" aria-label="Cài đặt học">
        <div className="vintage-settings-header">
          <div className="vintage-settings-title-wrap">
            <Settings size={18} className="vintage-settings-icon" />
            <span className="vintage-settings-title">Cài đặt Phiên Học</span>
          </div>
          <button
            type="button"
            className="vintage-settings-close-btn"
            onClick={onClose}
            aria-label="Đóng cài đặt"
          >
            <X size={18} />
          </button>
        </div>

        <div className="vintage-settings-body">
          <label className="vintage-setting-row">
            <div className="vintage-setting-info">
              <span className="vintage-setting-label">Tự đọc từ tiếng Anh</span>
              <span className="vintage-setting-desc">Phát âm từ vựng khi xem câu hỏi hoặc phản hồi</span>
            </div>
            <input
              type="checkbox"
              className="vintage-setting-checkbox"
              checked={Boolean(options.autoSpeak)}
              onChange={(e) => onOptionsChange({ autoSpeak: e.target.checked })}
            />
          </label>

          <label className="vintage-setting-row">
            <div className="vintage-setting-info">
              <span className="vintage-setting-label">Âm thanh hiệu ứng</span>
              <span className="vintage-setting-desc">Phát âm thanh khi trả lời đúng hoặc sai</span>
            </div>
            <input
              type="checkbox"
              className="vintage-setting-checkbox"
              checked={Boolean(options.soundEffects)}
              onChange={(e) => onOptionsChange({ soundEffects: e.target.checked })}
            />
          </label>

          <label className="vintage-setting-row">
            <div className="vintage-setting-info">
              <span className="vintage-setting-label">Bỏ qua dấu tiếng Việt khi chấm</span>
              <span className="vintage-setting-desc">Chấp nhận câu trả lời tiếng Việt không dấu</span>
            </div>
            <input
              type="checkbox"
              className="vintage-setting-checkbox"
              checked={Boolean(options.ignoreDiacritics)}
              onChange={(e) => onOptionsChange({ ignoreDiacritics: e.target.checked })}
            />
          </label>

          <label className="vintage-setting-row">
            <div className="vintage-setting-info">
              <span className="vintage-setting-label">Chấp nhận từ đồng nghĩa</span>
              <span className="vintage-setting-desc">Chấp nhận các từ đồng nghĩa được lưu trong bộ thẻ</span>
            </div>
            <input
              type="checkbox"
              className="vintage-setting-checkbox"
              checked={options.acceptSynonyms !== false}
              onChange={(e) => onOptionsChange({ acceptSynonyms: e.target.checked })}
            />
          </label>

          <label className="vintage-setting-row">
            <div className="vintage-setting-info">
              <span className="vintage-setting-label">Tự chuyển câu khi đúng</span>
              <span className="vintage-setting-desc">Tự động chuyển sang câu tiếp theo sau khi trả lời đúng</span>
            </div>
            <input
              type="checkbox"
              className="vintage-setting-checkbox"
              checked={Boolean(options.autoAdvance)}
              onChange={(e) => onOptionsChange({ autoAdvance: e.target.checked })}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
