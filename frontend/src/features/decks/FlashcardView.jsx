import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Volume2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCcw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  getNextIndex,
  getPrevIndex,
  shuffleCards,
  calculateProgressPercent,
} from '../../utils/flashcardNavigation';
import { handleFlashcardKeyDown } from '../../utils/flashcardKeyboard';
import { speakEnglishTerm } from '../../utils/speechUtils';

function loadSettings() {
  try {
    const raw = localStorage.getItem('ll_flashcard_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        frontFace: parsed.frontFace === 'definition' ? 'definition' : 'term',
        autoSpeak: Boolean(parsed.autoSpeak),
      };
    }
  } catch {
    // Safe fallback
  }
  return { frontFace: 'term', autoSpeak: false };
}

function saveSettings(settings) {
  try {
    localStorage.setItem('ll_flashcard_settings', JSON.stringify(settings));
  } catch {
    // Safe fallback
  }
}

export default function FlashcardView({ cards = [], onToast }) {
  const [activeCards, setActiveCards] = useState(cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [settings, setSettings] = useState(loadSettings);

  const settingsRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  // Sync activeCards when raw cards prop updates
  useEffect(() => {
    setActiveCards(cards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled(false);
  }, [cards]);

  // Persist settings
  const handleUpdateSettings = (partial) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
  };

  // Close settings on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setIsSettingsOpen(false);
      }
    }
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  const currentCard = activeCards[currentIndex] || null;
  const termText = currentCard?.term || '';
  const defText = currentCard?.definition || '';
  const posText = currentCard?.partOfSpeech || '';
  const ipaText = currentCard?.pronunciation || '';
  const exampleText = currentCard?.example || '';

  const handleFlip = useCallback(() => {
    setIsSettingsOpen(false);
    setIsFlipped((prev) => {
      const next = !prev;
      const wordToRead = currentCard?.term;
      // Auto-read on flip if enabled
      if (next && settings.autoSpeak && wordToRead) {
        speakEnglishTerm(wordToRead, (msg) => onToast?.(msg, 'warning'));
      }
      return next;
    });
  }, [settings.autoSpeak, currentCard, onToast]);

  const handleNext = useCallback(() => {
    if (currentIndex < activeCards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((prev) => getNextIndex(prev, activeCards.length));
    }
  }, [currentIndex, activeCards.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex((prev) => getPrevIndex(prev));
    }
  }, [currentIndex]);

  const handleToggleShuffle = useCallback(() => {
    if (isShuffled) {
      // Revert to original order
      const curId = currentCard?.id;
      setActiveCards(cards);
      setIsShuffled(false);
      setIsFlipped(false);
      const foundIdx = cards.findIndex((c) => c.id === curId);
      setCurrentIndex(foundIdx >= 0 ? foundIdx : 0);
      onToast?.('Đã tắt trộn thẻ (thứ tự ban đầu)', 'info');
    } else {
      // Shuffle
      const curId = currentCard?.id;
      const shuffled = shuffleCards(cards);
      setActiveCards(shuffled);
      setIsShuffled(true);
      setIsFlipped(false);
      const foundIdx = shuffled.findIndex((c) => c.id === curId);
      setCurrentIndex(foundIdx >= 0 ? foundIdx : 0);
      onToast?.('Đã trộn ngẫu nhiên thứ tự thẻ', 'info');
    }
  }, [isShuffled, cards, currentCard, onToast]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    onToast?.('Đã bắt đầu lại từ thẻ đầu tiên', 'info');
  }, [onToast]);

  const handleSpeak = useCallback(
    (e, text) => {
      e?.stopPropagation();
      speakEnglishTerm(text, (msg) => onToast?.(msg, 'warning'));
    },
    [onToast]
  );

  // Touch / Swipe gestures for mobile & tablet
  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e) => {
    if (!e.changedTouches || e.changedTouches.length !== 1) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Detect fast horizontal swipe
    if (deltaTime < 500 && Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  // Keyboard navigation using strictly tested pure handler
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
        return;
      }

      const isModalOrPopoverOpen =
        Boolean(isSettingsOpen) ||
        Boolean(document.querySelector('.modal-overlay')) ||
        Boolean(document.querySelector('[role="dialog"]')) ||
        Boolean(document.querySelector('.deck-action-menu')) ||
        Boolean(document.querySelector('.sidebar-user-dropdown'));

      handleFlashcardKeyDown(e, {
        isModalOrPopoverOpen,
        onPrev: handlePrev,
        onNext: handleNext,
        onFlip: handleFlip,
      });
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, handleFlip, isSettingsOpen, isZenMode]);

  if (!currentCard) return null;

  const totalCount = activeCards.length;
  const progressPercent = calculateProgressPercent(currentIndex, totalCount);

  // Parse synonyms safely if needed
  let synonymsList = [];
  if (Array.isArray(currentCard.synonyms)) {
    synonymsList = currentCard.synonyms;
  } else if (typeof currentCard.synonyms === 'string') {
    synonymsList = currentCard.synonyms
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Determine what is displayed on Front & Back
  const isTermOnFront = settings.frontFace === 'term';

  return (
    <div className={`flashcard-experience-container ${isZenMode ? 'is-zen-mode' : ''}`}>
      {/* 1. Main Flashcard Container with 3D Flip */}
      <div className="flashcard-scene">
        <div
          className={`flashcard-card-box ${isFlipped ? 'is-flipped' : ''}`}
          onClick={handleFlip}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          role="button"
          tabIndex={0}
          aria-label={isFlipped ? 'Mặt sau thẻ' : 'Mặt trước thẻ'}
        >
          {/* FRONT FACE */}
          <div className="flashcard-face flashcard-front">
            {/* Card Top Action Bar (Inside Front Face) */}
            <div className="flashcard-top-bar" onClick={(e) => e.stopPropagation()}>
              {/* Settings Icon & Popover */}
              <div className="flashcard-settings-container" ref={settingsRef}>
                <button
                  type="button"
                  className="flashcard-icon-btn"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  aria-label="Cài đặt thẻ"
                  title="Cài đặt hiển thị"
                >
                  <Settings size={18} />
                </button>

                {isSettingsOpen && (
                  <div className="flashcard-settings-popover" role="region" aria-label="Tùy chọn hiển thị">
                    <div className="settings-popover-title">Cài đặt học Flashcard</div>

                    <div className="settings-popover-group">
                      <label className="settings-popover-label">Mặt trước hiển thị:</label>
                      <div className="settings-radio-options">
                        <label className="settings-radio-label">
                          <input
                            type="radio"
                            name="frontFace"
                            value="term"
                            checked={settings.frontFace === 'term'}
                            onChange={() => handleUpdateSettings({ frontFace: 'term' })}
                          />
                          <span>Thuật ngữ (Tiếng Anh)</span>
                        </label>
                        <label className="settings-radio-label">
                          <input
                            type="radio"
                            name="frontFace"
                            value="definition"
                            checked={settings.frontFace === 'definition'}
                            onChange={() => handleUpdateSettings({ frontFace: 'definition' })}
                          />
                          <span>Định nghĩa (Tiếng Việt)</span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-divider" />

                    <div className="settings-popover-group">
                      <label className="settings-checkbox-label">
                        <input
                          type="checkbox"
                          checked={settings.autoSpeak}
                          onChange={(e) => handleUpdateSettings({ autoSpeak: e.target.checked })}
                        />
                        <span>Tự đọc khi lật</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Hint / Flip badge */}
              <div className="flashcard-flip-hint">
                <span>Nhấn Space hoặc nhấp thẻ để lật</span>
              </div>

              {/* Audio Button on card */}
              <button
                type="button"
                className="flashcard-speaker-btn"
                onClick={(e) => handleSpeak(e, termText)}
                title="Phát âm tiếng Anh (en-US)"
                aria-label="Phát âm từ vựng"
              >
                <Volume2 size={20} />
              </button>
            </div>

            <div className="flashcard-content-wrap">
              {isTermOnFront ? (
                <>
                  <h2 className="flashcard-main-term">{termText}</h2>
                  {(posText || ipaText) && (
                    <p className="flashcard-meta-text">
                      {posText && <span className="flashcard-type">{posText}</span>}
                      {posText && ipaText && ' - '}
                      {ipaText && (
                        <span className="flashcard-ipa">{ipaText}</span>
                      )}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h2 className="flashcard-main-definition">{defText}</h2>
                  <p className="flashcard-meta-hint">Định nghĩa tiếng Việt</p>
                </>
              )}
            </div>
          </div>

          {/* BACK FACE */}
          <div className="flashcard-face flashcard-back">
            {/* Card Top Action Bar (Inside Back Face) */}
            <div className="flashcard-top-bar" onClick={(e) => e.stopPropagation()}>
              <div className="flashcard-face-badge">
                <span>{isTermOnFront ? 'Định nghĩa' : 'Thuật ngữ'}</span>
              </div>

              {/* Hint / Flip badge */}
              <div className="flashcard-flip-hint">
                <span>Nhấn Space hoặc nhấp thẻ để lật lại</span>
              </div>

              {/* Audio Button on card */}
              <button
                type="button"
                className="flashcard-speaker-btn"
                onClick={(e) => handleSpeak(e, termText)}
                title="Phát âm tiếng Anh (en-US)"
                aria-label="Phát âm từ vựng"
              >
                <Volume2 size={20} />
              </button>
            </div>

            <div className="flashcard-content-wrap">
              {isTermOnFront ? (
                <>
                  <h2 className="flashcard-main-definition">{defText}</h2>

                  {exampleText && (
                    <blockquote className="flashcard-example">
                      “{exampleText}”
                    </blockquote>
                  )}

                  {synonymsList.length > 0 && (
                    <div className="flashcard-synonyms-group">
                      <span className="synonyms-title">Từ đồng nghĩa:</span>
                      <div className="synonyms-chips">
                        {synonymsList.map((syn, idx) => (
                          <span key={idx} className="synonym-chip">
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flashcard-back-reminder">
                    <span className="reminder-word">{termText}</span>
                    {ipaText && (
                      <span className="reminder-ipa">{ipaText}</span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="flashcard-main-term">{termText}</h2>
                  {(posText || ipaText) && (
                    <p className="flashcard-meta-text">
                      {posText && <span className="flashcard-type">{posText}</span>}
                      {posText && ipaText && ' - '}
                      {ipaText && (
                        <span className="flashcard-ipa">{ipaText}</span>
                      )}
                    </p>
                  )}

                  {exampleText && (
                    <blockquote className="flashcard-example">
                      “{exampleText}”
                    </blockquote>
                  )}

                  {synonymsList.length > 0 && (
                    <div className="flashcard-synonyms-group">
                      <span className="synonyms-title">Từ đồng nghĩa:</span>
                      <div className="synonyms-chips">
                        {synonymsList.map((syn, idx) => (
                          <span key={idx} className="synonym-chip">
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Progress Under Card */}
      <div className="flashcard-controls-panel">
        {/* Previous Button */}
        <button
          type="button"
          className="flashcard-nav-btn"
          onClick={handlePrev}
          disabled={currentIndex <= 0}
          title="Thẻ trước (←)"
          aria-label="Thẻ trước"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Counter and Progress Bar */}
        <div className="flashcard-progress-box">
          <div className="flashcard-counter-label">
            <span className="current-num">{currentIndex + 1}</span>
            <span className="counter-divider">/</span>
            <span className="total-num">{totalCount}</span>
          </div>

          <div className="flashcard-progress-track">
            <div
              className="flashcard-progress-bar"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>
        </div>

        {/* Next Button */}
        <button
          type="button"
          className="flashcard-nav-btn"
          onClick={handleNext}
          disabled={currentIndex >= totalCount - 1}
          title="Thẻ tiếp theo (→)"
          aria-label="Thẻ tiếp theo"
        >
          <ChevronRight size={22} />
        </button>

        {/* Action Toggles: Shuffle, Restart & Zen Mode */}
        <div className="flashcard-aux-actions">
          <button
            type="button"
            className={`flashcard-tool-btn ${isShuffled ? 'is-active' : ''}`}
            onClick={handleToggleShuffle}
            title={isShuffled ? 'Tắt trộn thẻ' : 'Trộn ngẫu nhiên thẻ (S)'}
            aria-pressed={isShuffled}
            aria-label="Trộn ngẫu nhiên thẻ"
          >
            <Shuffle size={17} />
          </button>

          <button
            type="button"
            className="flashcard-tool-btn"
            onClick={handleRestart}
            title="Bắt đầu lại từ đầu (R)"
            aria-label="Bắt đầu lại"
          >
            <RotateCcw size={17} />
          </button>

          <button
            type="button"
            className={`flashcard-tool-btn ${isZenMode ? 'is-active' : ''}`}
            onClick={() => setIsZenMode(!isZenMode)}
            title={isZenMode ? 'Thoát chế độ tập trung (Esc)' : 'Chế độ tập trung Zen Mode'}
            aria-label="Chế độ tập trung"
          >
            {isZenMode ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </div>

      {/* 3. Keyboard & Gesture Shortcuts Legend */}
      <div className="flashcard-shortcuts-legend">
        <span className="shortcut-item">
          <kbd className="flashcard-kbd">Space</kbd> Lật thẻ
        </span>
        <span className="shortcut-divider">·</span>
        <span className="shortcut-item">
          <kbd className="flashcard-kbd">←</kbd> <kbd className="flashcard-kbd">→</kbd> Chuyển thẻ / Vuốt màn hình
        </span>
        <span className="shortcut-divider">·</span>
        <span className="shortcut-item">
          <kbd className="flashcard-kbd">Esc</kbd> Thoát Zen
        </span>
      </div>
    </div>
  );
}
