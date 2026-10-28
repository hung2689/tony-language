import { useState } from 'react';
import {
  Clock,
  ArrowLeftRight,
  GraduationCap,
  Settings,
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
    <div className="learn-setup-container vintage-learn-container">
      {/* Top Bar Navigation with Vintage Pirate Navigation */}
      <header className="vintage-deck-header-row learn-vintage-header">
        {/* Left: Vintage Back Button */}
        <button
          type="button"
          className="vintage-header-back-btn"
          onClick={onExit}
          title="Quay lại bộ từ"
          aria-label="Quay lại bộ từ"
        >
          <img src="/assets/flashcard/button-back.png" alt="Quay lại" />
        </button>

        {/* Center: Classic Ornamental Book Title */}
        <div className="vintage-header-title-ribbon" title={deck?.name}>
          <span className="vintage-title-flourish is-left" aria-hidden="true">
            <span className="flourish-line" />
            <span className="flourish-diamond">◆</span>
            <span className="flourish-dot">•</span>
          </span>
          <div className="vintage-ribbon-content">
            <img
              src="/assets/decor_icon/decor_vocabulary_book.png"
              alt=""
              className="vintage-title-book-icon"
            />
            <h1 className="vintage-ribbon-text">{deck?.name || 'Bộ từ vựng'}</h1>
          </div>
          <span className="vintage-title-flourish is-right" aria-hidden="true">
            <span className="flourish-dot">•</span>
            <span className="flourish-diamond">◆</span>
            <span className="flourish-line" />
          </span>
        </div>

        {/* Right: Word Count Badge */}
        <div className="vintage-header-count-badge" title="Tổng số từ trong bộ">
          <span className="count-number">{totalCards}</span>
          <span className="count-label">từ</span>
        </div>
      </header>

      {/* Main Container: Bản Lệnh Xuất Bến */}
      <div className="vintage-setup-parchment-panel">
        {/* Header Intro Area */}
        <div className="vintage-setup-header-area">
          <h2 className="vintage-setup-title">Cài đặt Hải trình Học tập</h2>
          <p className="vintage-setup-subtitle">
            Gõ câu trả lời chính xác để chinh phục hải trình tri thức. Các từ trả lời chưa chuẩn sẽ được lặp lại cho đến khi bạn hoàn toàn thành thạo.
          </p>
        </div>

        {/* Form with 4 Settings Cards in 2x2 Grid */}
        <form onSubmit={handleStart} className="vintage-setup-form">
          <div className="vintage-setup-grid">
            {/* Card 1: Số lượng câu hỏi */}
            <div className="vintage-setting-card">
              <div className="vintage-setting-card-title">
                <Clock size={18} className="vintage-setting-icon" />
                <span>Số lượng câu hỏi</span>
              </div>

              <div className="vintage-setting-options">
                <label className="vintage-option-row">
                  <input
                    type="radio"
                    name="countMode"
                    value="all"
                    className="vintage-radio-custom"
                    checked={options.countMode === 'all'}
                    onChange={() => {
                      setCountError('');
                      onOptionsChange({ countMode: 'all' });
                    }}
                  />
                  <span className="vintage-option-label">
                    Tất cả ({totalCards} từ)
                  </span>
                </label>

                <label className="vintage-option-row">
                  <input
                    type="radio"
                    name="countMode"
                    value="custom"
                    className="vintage-radio-custom"
                    checked={options.countMode === 'custom'}
                    onChange={() => {
                      onOptionsChange({ countMode: 'custom' });
                    }}
                  />
                  <span className="vintage-option-label">Tùy chọn:</span>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, totalCards)}
                    className="vintage-custom-number-input"
                    value={customCountInput}
                    disabled={options.countMode !== 'custom'}
                    onChange={handleCustomCountChange}
                    aria-label="Số câu tùy chọn"
                  />
                  <span className="vintage-option-sublabel">từ</span>
                </label>
              </div>
              {countError && <p className="vintage-validation-error">{countError}</p>}
            </div>

            {/* Card 2: Thứ tự câu hỏi */}
            <div className="vintage-setting-card">
              <div className="vintage-setting-card-title">
                <ArrowLeftRight size={18} className="vintage-setting-icon" />
                <span>Thứ tự hải trình</span>
              </div>

              <div className="vintage-setting-options">
                <label className="vintage-option-row">
                  <input
                    type="radio"
                    name="order"
                    value="random"
                    className="vintage-radio-custom"
                    checked={options.order === 'random'}
                    onChange={() => onOptionsChange({ order: 'random' })}
                  />
                  <span className="vintage-option-label">Ngẫu nhiên hải trình</span>
                </label>

                <label className="vintage-option-row">
                  <input
                    type="radio"
                    name="order"
                    value="order"
                    className="vintage-radio-custom"
                    checked={options.order === 'order'}
                    onChange={() => onOptionsChange({ order: 'order' })}
                  />
                  <span className="vintage-option-label">Theo thứ tự bộ từ</span>
                </label>
              </div>
            </div>

            {/* Card 3: Hướng học */}
            <div className="vintage-setting-card">
              <div className="vintage-setting-card-title">
                <GraduationCap size={18} className="vintage-setting-icon" />
                <span>Hướng học tập</span>
              </div>

              <div className="vintage-setting-options">
                <label className="vintage-option-row">
                  <input
                    type="radio"
                    name="direction"
                    value="VI_TO_EN"
                    className="vintage-radio-custom"
                    checked={options.direction === 'VI_TO_EN'}
                    onChange={() => onOptionsChange({ direction: 'VI_TO_EN' })}
                  />
                  <span className="vintage-option-label">
                    Việt → Anh (Xem nghĩa tiếng Việt, gõ từ tiếng Anh)
                  </span>
                </label>

                <label className="vintage-option-row">
                  <input
                    type="radio"
                    name="direction"
                    value="EN_TO_VI"
                    className="vintage-radio-custom"
                    checked={options.direction === 'EN_TO_VI'}
                    onChange={() => onOptionsChange({ direction: 'EN_TO_VI' })}
                  />
                  <span className="vintage-option-label">
                    Anh → Việt (Xem từ tiếng Anh, gõ nghĩa tiếng Việt)
                  </span>
                </label>

                <label className="vintage-option-row">
                  <input
                    type="radio"
                    name="direction"
                    value="RANDOM"
                    className="vintage-radio-custom"
                    checked={options.direction === 'RANDOM'}
                    onChange={() => onOptionsChange({ direction: 'RANDOM' })}
                  />
                  <span className="vintage-option-label">
                    Trộn cả hai hướng ngẫu nhiên
                  </span>
                </label>
              </div>
            </div>

            {/* Card 4: Tùy chọn bổ trợ */}
            <div className="vintage-setting-card">
              <div className="vintage-setting-card-title">
                <Settings size={18} className="vintage-setting-icon" />
                <span>Tùy chọn bổ trợ</span>
              </div>

              <div className="vintage-setting-options">
                <label className="vintage-option-row">
                  <input
                    type="checkbox"
                    className="vintage-checkbox-custom"
                    checked={Boolean(options.autoSpeak)}
                    onChange={(e) => onOptionsChange({ autoSpeak: e.target.checked })}
                  />
                  <span className="vintage-option-label">Tự đọc từ tiếng Anh</span>
                </label>

                <label className="vintage-option-row">
                  <input
                    type="checkbox"
                    className="vintage-checkbox-custom"
                    checked={Boolean(options.soundEffects)}
                    onChange={(e) => onOptionsChange({ soundEffects: e.target.checked })}
                  />
                  <span className="vintage-option-label">Âm thanh hiệu ứng</span>
                </label>

                <label className="vintage-option-row">
                  <input
                    type="checkbox"
                    className="vintage-checkbox-custom"
                    checked={Boolean(options.ignoreDiacritics)}
                    onChange={(e) => onOptionsChange({ ignoreDiacritics: e.target.checked })}
                  />
                  <span className="vintage-option-label">Bỏ qua dấu tiếng Việt khi chấm</span>
                </label>

                <label className="vintage-option-row">
                  <input
                    type="checkbox"
                    className="vintage-checkbox-custom"
                    checked={options.acceptSynonyms !== false}
                    onChange={(e) => onOptionsChange({ acceptSynonyms: e.target.checked })}
                  />
                  <span className="vintage-option-label">Chấp nhận từ đồng nghĩa</span>
                </label>
              </div>
            </div>
          </div>

          {/* Bottom Action Area: RPG Launch Button */}
          <div className="vintage-setup-bottom-bar">
            <button
              type="submit"
              className="vintage-launch-voyage-btn"
              disabled={totalCards === 0 || Boolean(countError)}
            >
              <span className="vintage-btn-icon">⚔</span>
              <span>BẮT ĐẦU HẢI TRÌNH HỌC TẬP</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
