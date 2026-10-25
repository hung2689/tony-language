import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

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
    <div className="learn-settings-popover" ref={popoverRef} role="dialog" aria-label="Cài đặt học">
      <div className="learn-settings-header">
        <span className="learn-settings-title">Cài đặt phiên học</span>
        <button
          type="button"
          className="learn-settings-close-btn"
          onClick={onClose}
          aria-label="Đóng cài đặt"
        >
          <X size={16} />
        </button>
      </div>

      <div className="learn-settings-body">
        <label className="learn-setting-row">
          <div className="learn-setting-info">
            <span className="learn-setting-label">Tự đọc từ tiếng Anh</span>
            <span className="learn-setting-desc">Phát âm từ vựng khi xem câu hỏi hoặc phản hồi</span>
          </div>
          <input
            type="checkbox"
            className="learn-setting-checkbox"
            checked={Boolean(options.autoSpeak)}
            onChange={(e) => onOptionsChange({ autoSpeak: e.target.checked })}
          />
        </label>

        <label className="learn-setting-row">
          <div className="learn-setting-info">
            <span className="learn-setting-label">Âm thanh hiệu ứng</span>
            <span className="learn-setting-desc">Phát âm thanh khi trả lời đúng hoặc sai</span>
          </div>
          <input
            type="checkbox"
            className="learn-setting-checkbox"
            checked={Boolean(options.soundEffects)}
            onChange={(e) => onOptionsChange({ soundEffects: e.target.checked })}
          />
        </label>

        <label className="learn-setting-row">
          <div className="learn-setting-info">
            <span className="learn-setting-label">Bỏ qua dấu tiếng Việt khi chấm</span>
            <span className="learn-setting-desc">Chấp nhận câu trả lời tiếng Việt không dấu</span>
          </div>
          <input
            type="checkbox"
            className="learn-setting-checkbox"
            checked={Boolean(options.ignoreDiacritics)}
            onChange={(e) => onOptionsChange({ ignoreDiacritics: e.target.checked })}
          />
        </label>

        <label className="learn-setting-row">
          <div className="learn-setting-info">
            <span className="learn-setting-label">Chấp nhận từ đồng nghĩa</span>
            <span className="learn-setting-desc">Chấp nhận các từ đồng nghĩa được lưu trong bộ thẻ</span>
          </div>
          <input
            type="checkbox"
            className="learn-setting-checkbox"
            checked={options.acceptSynonyms !== false}
            onChange={(e) => onOptionsChange({ acceptSynonyms: e.target.checked })}
          />
        </label>

        <label className="learn-setting-row">
          <div className="learn-setting-info">
            <span className="learn-setting-label">Tự chuyển câu khi đúng</span>
            <span className="learn-setting-desc">Tự động chuyển sang câu tiếp theo sau khi trả lời đúng</span>
          </div>
          <input
            type="checkbox"
            className="learn-setting-checkbox"
            checked={Boolean(options.autoAdvance)}
            onChange={(e) => onOptionsChange({ autoAdvance: e.target.checked })}
          />
        </label>
      </div>
    </div>
  );
}
