import { useState } from 'react';
import {
  ArrowLeft,
  Play,
  FileEdit,
  Clock,
  ArrowLeftRight,
  GraduationCap,
  Settings,
  BookOpen,
} from 'lucide-react';

export default function LearnSetup({
  deck,
  cards = [],
  options,
  onOptionsChange,
  onStartSession,
  onExit,
}) {
  const totalCards = cards.length;
  const [customCountInput, setCustomCountInput] = useState(
    String(options.customCount || Math.min(10, totalCards || 1))
  );
  const [countError, setCountError] = useState('');

  const handleCustomCountChange = (e) => {
    const val = e.target.value;
    setCustomCountInput(val);

    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > totalCards) {
      setCountError(`Số câu hỏi phải từ 1 đến ${totalCards}`);
    } else {
      setCountError('');
      onOptionsChange({ customCount: parsed });
    }
  };

  const handleStart = (e) => {
    e.preventDefault();
    if (totalCards === 0) return;

    if (options.countMode === 'custom') {
      const parsed = parseInt(customCountInput, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > totalCards) {
        setCountError(`Số câu hỏi phải từ 1 đến ${totalCards}`);
        return;
      }
      onOptionsChange({ customCount: parsed });
    }

    onStartSession();
  };

  return (
    <div className="learn-setup-container">
      {/* Top Bar Navigation */}
      <header className="learn-top-bar">
        <button
          type="button"
          className="learn-back-btn"
          onClick={onExit}
          aria-label="Quay lại trang bộ từ"
        >
          <ArrowLeft size={16} />
          <span>Thoát</span>
        </button>
        <span className="learn-deck-heading" title={deck?.name}>
          {deck?.name || 'Bộ từ vựng'}
        </span>
        <div className="learn-top-bar-placeholder" />
      </header>

      {/* Main Container Card (White Card with Minimalist SaaS style) */}
      <div className="learn-setup-card">
        {/* Header Intro Area */}
        <div className="learn-setup-header-area">
          <div className="learn-setup-header-left">
            <div className="learn-setup-icon-box">
              <FileEdit size={22} className="learn-setup-header-icon" />
            </div>
            <div className="learn-setup-header-text">
              <h1 className="learn-setup-title">Cài đặt bài tập / câu hỏi</h1>
              <p className="learn-setup-subtitle">
                Gõ câu trả lời chính xác để ghi nhớ từ vựng. Các từ trả lời sai sẽ được lặp lại cho đến khi bạn thành thạo.
              </p>
            </div>
          </div>
          <div className="learn-setup-header-deco">
            <BookOpen size={28} className="learn-setup-deco-icon" />
          </div>
        </div>

        {/* Form with 4 Settings Cards in 2x2 Grid */}
        <form onSubmit={handleStart} className="learn-setup-form">
          <div className="learn-setup-grid">
            {/* Card 1: Số lượng câu hỏi */}
            <div className="learn-setting-card">
              <div className="learn-setting-card-title">
                <Clock size={18} className="learn-setting-icon" />
                <span>Số lượng câu hỏi</span>
              </div>

              <div className="learn-setting-options">
                <label className="learn-option-row">
                  <input
                    type="radio"
                    name="countMode"
                    value="all"
                    className="learn-radio-custom"
                    checked={options.countMode === 'all'}
                    onChange={() => {
                      setCountError('');
                      onOptionsChange({ countMode: 'all' });
                    }}
                  />
                  <span className="learn-option-label">
                    Tất cả ({totalCards} từ)
                  </span>
                </label>

                <label className="learn-option-row">
                  <input
                    type="radio"
                    name="countMode"
                    value="custom"
                    className="learn-radio-custom"
                    checked={options.countMode === 'custom'}
                    onChange={() => {
                      onOptionsChange({ countMode: 'custom' });
                    }}
                  />
                  <span className="learn-option-label">Tùy chọn:</span>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, totalCards)}
                    className="learn-custom-number-input"
                    value={customCountInput}
                    disabled={options.countMode !== 'custom'}
                    onChange={handleCustomCountChange}
                    aria-label="Số câu tùy chọn"
                  />
                  <span className="learn-option-sublabel">từ</span>
                </label>
              </div>
              {countError && <p className="learn-validation-error">{countError}</p>}
            </div>

            {/* Card 2: Thứ tự câu hỏi */}
            <div className="learn-setting-card">
              <div className="learn-setting-card-title">
                <ArrowLeftRight size={18} className="learn-setting-icon" />
                <span>Thứ tự câu hỏi</span>
              </div>

              <div className="learn-setting-options">
                <label className="learn-option-row">
                  <input
                    type="radio"
                    name="order"
                    value="random"
                    className="learn-radio-custom"
                    checked={options.order === 'random'}
                    onChange={() => onOptionsChange({ order: 'random' })}
                  />
                  <span className="learn-option-label">Ngẫu nhiên</span>
                </label>

                <label className="learn-option-row">
                  <input
                    type="radio"
                    name="order"
                    value="order"
                    className="learn-radio-custom"
                    checked={options.order === 'order'}
                    onChange={() => onOptionsChange({ order: 'order' })}
                  />
                  <span className="learn-option-label">Theo thứ tự bộ từ</span>
                </label>
              </div>
            </div>

            {/* Card 3: Hướng học */}
            <div className="learn-setting-card">
              <div className="learn-setting-card-title">
                <GraduationCap size={18} className="learn-setting-icon" />
                <span>Hướng học</span>
              </div>

              <div className="learn-setting-options">
                <label className="learn-option-row">
                  <input
                    type="radio"
                    name="direction"
                    value="VI_TO_EN"
                    className="learn-radio-custom"
                    checked={options.direction === 'VI_TO_EN'}
                    onChange={() => onOptionsChange({ direction: 'VI_TO_EN' })}
                  />
                  <span className="learn-option-label">
                    Việt → Anh (Xem nghĩa tiếng Việt, gõ từ tiếng Anh)
                  </span>
                </label>

                <label className="learn-option-row">
                  <input
                    type="radio"
                    name="direction"
                    value="EN_TO_VI"
                    className="learn-radio-custom"
                    checked={options.direction === 'EN_TO_VI'}
                    onChange={() => onOptionsChange({ direction: 'EN_TO_VI' })}
                  />
                  <span className="learn-option-label">
                    Anh → Việt (Xem từ tiếng Anh, gõ nghĩa tiếng Việt)
                  </span>
                </label>

                <label className="learn-option-row">
                  <input
                    type="radio"
                    name="direction"
                    value="RANDOM"
                    className="learn-radio-custom"
                    checked={options.direction === 'RANDOM'}
                    onChange={() => onOptionsChange({ direction: 'RANDOM' })}
                  />
                  <span className="learn-option-label">
                    Trộn cả hai hướng ngẫu nhiên
                  </span>
                </label>
              </div>
            </div>

            {/* Card 4: Tùy chọn bổ trợ */}
            <div className="learn-setting-card">
              <div className="learn-setting-card-title">
                <Settings size={18} className="learn-setting-icon" />
                <span>Tùy chọn bổ trợ</span>
              </div>

              <div className="learn-setting-options">
                <label className="learn-option-row">
                  <input
                    type="checkbox"
                    className="learn-checkbox-custom"
                    checked={Boolean(options.autoSpeak)}
                    onChange={(e) => onOptionsChange({ autoSpeak: e.target.checked })}
                  />
                  <span className="learn-option-label">Tự đọc từ tiếng Anh</span>
                </label>

                <label className="learn-option-row">
                  <input
                    type="checkbox"
                    className="learn-checkbox-custom"
                    checked={Boolean(options.soundEffects)}
                    onChange={(e) => onOptionsChange({ soundEffects: e.target.checked })}
                  />
                  <span className="learn-option-label">Âm thanh hiệu ứng</span>
                </label>

                <label className="learn-option-row">
                  <input
                    type="checkbox"
                    className="learn-checkbox-custom"
                    checked={Boolean(options.ignoreDiacritics)}
                    onChange={(e) => onOptionsChange({ ignoreDiacritics: e.target.checked })}
                  />
                  <span className="learn-option-label">Bỏ qua dấu tiếng Việt khi chấm</span>
                </label>

                <label className="learn-option-row">
                  <input
                    type="checkbox"
                    className="learn-checkbox-custom"
                    checked={options.acceptSynonyms !== false}
                    onChange={(e) => onOptionsChange({ acceptSynonyms: e.target.checked })}
                  />
                  <span className="learn-option-label">Chấp nhận từ đồng nghĩa</span>
                </label>
              </div>
            </div>
          </div>

          {/* Bottom Action Area: Pill button on the bottom right */}
          <div className="learn-setup-bottom-bar">
            <button
              type="submit"
              className="learn-pill-start-btn"
              disabled={totalCards === 0 || Boolean(countError)}
            >
              <Play size={14} fill="currentColor" className="learn-play-icon" />
              <span>Bắt đầu học</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
