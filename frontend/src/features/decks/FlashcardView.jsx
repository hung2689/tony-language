import { useState, useEffect, useCallback, useRef } from 'react';
import {
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
  const rawIpa = currentCard?.pronunciation || '';
  const ipaText = rawIpa ? `/${rawIpa.replace(/^\/+|\/+$/g, '')}/` : '';
  const exampleText = currentCard?.example || '';

  const handleFlip = useCallback(() => {
    setIsSettingsOpen(false);
    setIsFlipped((prev) => {
      const next = !prev;
      const wordToRead = currentCard?.term;
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
      const curId = currentCard?.id;
      setActiveCards(cards);
      setIsShuffled(false);
      setIsFlipped(false);
      const foundIdx = cards.findIndex((c) => c.id === curId);
      setCurrentIndex(foundIdx >= 0 ? foundIdx : 0);
      onToast?.('Đã tắt trộn thẻ (thứ tự ban đầu)', 'info');
    } else {
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

    if (deltaTime < 500 && Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  // Keyboard navigation
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
        Boolean(document.querySelector('.vintage-dropdown-menu'));

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

  let synonymsList = [];
  if (Array.isArray(currentCard.synonyms)) {
    synonymsList = currentCard.synonyms;
  } else if (typeof currentCard.synonyms === 'string') {
    synonymsList = currentCard.synonyms
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const isTermOnFront = settings.frontFace === 'term';

  return (
    <div className={`vintage-flashcard-experience ${isZenMode ? 'is-zen-mode' : ''}`}>
      {/* 1. Main Flashcard Scene */}
      <div className="vintage-flashcard-stage">
        <div className="vintage-card-scene">
          <div
            className={`vintage-card-box ${isFlipped ? 'is-flipped' : ''}`}
            onClick={handleFlip}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="button"
            tabIndex={0}
            aria-label={isFlipped ? 'Mặt sau thẻ' : 'Mặt trước thẻ'}
          >
            {/* FRONT FACE */}
            <div className="vintage-card-face vintage-card-front">
              {/* Top-Left: Compass Rose */}
              <img
                src="/assets/flashcard/flashcard-compass.png"
                alt=""
                className="vintage-fc-compass"
              />

              {/* Top-Center: Label Ribbon */}
              <div className="vintage-fc-label-wrap">
                <img
                  src="/assets/flashcard/flashcard-label.png"
                  alt=""
                  className="vintage-fc-label-img"
                />
                <span className="vintage-fc-label-text">
                  {isTermOnFront ? 'Mặt trước' : 'Mặt sau'}
                </span>
              </div>

              {/* Top-Right: Sound Trigger */}
              <button
                type="button"
                className="vintage-fc-sound-btn"
                onClick={(e) => handleSpeak(e, termText)}
                title="Phát âm tiếng Anh (en-US)"
                aria-label="Phát âm từ vựng"
              >
                <img
                  src="/assets/flashcard/flashcard-sound.png"
                  alt="Phát âm"
                  className="vintage-fc-sound-img"
                />
              </button>

              {/* Center Content */}
              <div className="vintage-fc-center">
                {isTermOnFront ? (
                  <>
                    <h2 className="vintage-fc-main-term">{termText}</h2>
                    {(posText || ipaText) && (
                      <p className="vintage-fc-meta">
                        {ipaText && <span className="vintage-fc-ipa">{ipaText}</span>}
                        {posText && ipaText && <span className="vintage-fc-meta-sep"> · </span>}
                        {posText && <span className="vintage-fc-pos">{posText}</span>}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="vintage-fc-main-def">{defText}</h2>
                    <p className="vintage-fc-meta">Định nghĩa tiếng Việt</p>
                  </>
                )}
              </div>

              {/* Bottom-Left: Mountains */}
              <img
                src="/assets/flashcard/flashcard-landscape.png"
                alt=""
                className="vintage-fc-landscape"
              />

              {/* Bottom-Right: Galleon Ship */}
              <img
                src="/assets/flashcard/flashcard-ship.png"
                alt=""
                className="vintage-fc-ship"
              />
            </div>

            {/* BACK FACE */}
            <div className="vintage-card-face vintage-card-back">
              {/* Top-Left: Compass Rose */}
              <img
                src="/assets/flashcard/flashcard-compass.png"
                alt=""
                className="vintage-fc-compass"
              />

              {/* Top-Center: Label Ribbon */}
              <div className="vintage-fc-label-wrap">
                <img
                  src="/assets/flashcard/flashcard-label.png"
                  alt=""
                  className="vintage-fc-label-img"
                />
                <span className="vintage-fc-label-text">
                  {isTermOnFront ? 'Mặt sau' : 'Mặt trước'}
                </span>
              </div>

              {/* Top-Right: Sound Trigger */}
              <button
                type="button"
                className="vintage-fc-sound-btn"
                onClick={(e) => handleSpeak(e, termText)}
                title="Phát âm tiếng Anh (en-US)"
                aria-label="Phát âm từ vựng"
              >
                <img
                  src="/assets/flashcard/flashcard-sound.png"
                  alt="Phát âm"
                  className="vintage-fc-sound-img"
                />
              </button>

              {/* Center Content */}
              <div className="vintage-fc-center">
                {isTermOnFront ? (
                  <>
                    <h2 className="vintage-fc-main-def">{defText}</h2>

                    {exampleText && (
                      <blockquote className="vintage-fc-example">
                        “{exampleText}”
                      </blockquote>
                    )}

                    {synonymsList.length > 0 && (
                      <div className="vintage-fc-synonyms">
                        <span className="vintage-fc-syn-label">Từ đồng nghĩa: </span>
                        <span className="vintage-fc-syn-values">{synonymsList.join(', ')}</span>
                      </div>
                    )}

                    <div className="vintage-fc-reminder">
                      <span className="vintage-fc-reminder-word">{termText}</span>
                      {ipaText && <span className="vintage-fc-reminder-ipa"> ({ipaText})</span>}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="vintage-fc-main-term">{termText}</h2>
                    {(posText || ipaText) && (
                      <p className="vintage-fc-meta">
                        {ipaText && <span className="vintage-fc-ipa">{ipaText}</span>}
                        {posText && ipaText && <span className="vintage-fc-meta-sep"> · </span>}
                        {posText && <span className="vintage-fc-pos">{posText}</span>}
                      </p>
                    )}
                    {exampleText && (
                      <blockquote className="vintage-fc-example">
                        “{exampleText}”
                      </blockquote>
                    )}
                  </>
                )}
              </div>

              {/* Bottom-Left: Mountains */}
              <img
                src="/assets/flashcard/flashcard-landscape.png"
                alt=""
                className="vintage-fc-landscape"
              />

              {/* Bottom-Right: Galleon Ship */}
              <img
                src="/assets/flashcard/flashcard-ship.png"
                alt=""
                className="vintage-fc-ship"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Vintage Controls Toolbar Row Under Card: [ < ]  [ 1 / 12 | ⚙ | 🔀 | ↻ | ⛶ ]  [ > ] [ ⛶ ] */}
      <div className="vintage-fc-toolbar-row">
        {/* Left Circular Prev Button */}
        <button
          type="button"
          className="vintage-card-nav-arrow is-prev"
          onClick={handlePrev}
          disabled={currentIndex <= 0}
          title="Thẻ trước (←)"
          aria-label="Thẻ trước"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Central Vintage Parchment Capsule */}
        <div className="vintage-fc-controls-bar">
          <span className="vintage-fc-capsule-ornament" aria-hidden="true">◆</span>

          <span className="vintage-fc-counter" title="Vị trí thẻ hiện tại">
            {currentIndex + 1} / {totalCount}
          </span>

          <span className="vintage-fc-bar-sep" aria-hidden="true" />

          {/* Settings Popover Trigger */}
          <div style={{ position: 'relative' }} ref={settingsRef}>
            <button
              type="button"
              className={`vintage-fc-tool-btn ${isSettingsOpen ? 'is-active' : ''}`}
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              title="Cài đặt hiển thị mặt thẻ"
              aria-label="Cài đặt hiển thị"
            >
              <Settings size={17} />
            </button>

            {isSettingsOpen && (
              <div className="vintage-fc-settings-popover" role="region" aria-label="Tùy chọn hiển thị">
                <div style={{ fontWeight: 700, marginBottom: 8, fontFamily: 'Georgia, serif', fontSize: 13 }}>
                  Cài đặt thẻ học
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>
                    Mặt trước hiển thị:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="frontFace"
                        value="term"
                        checked={settings.frontFace === 'term'}
                        onChange={() => handleUpdateSettings({ frontFace: 'term' })}
                      />
                      <span>Thuật ngữ (Tiếng Anh)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
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

                <div style={{ borderTop: '1px solid #C8B294', paddingTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.autoSpeak}
                      onChange={(e) => handleUpdateSettings({ autoSpeak: e.target.checked })}
                    />
                    <span>Tự đọc từ vựng khi lật</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <span className="vintage-fc-bar-sep" aria-hidden="true" />

          {/* Shuffle Button */}
          <button
            type="button"
            className={`vintage-fc-tool-btn ${isShuffled ? 'is-active' : ''}`}
            onClick={handleToggleShuffle}
            title={isShuffled ? 'Tắt trộn thẻ' : 'Trộn ngẫu nhiên thẻ'}
            aria-pressed={isShuffled}
            aria-label="Trộn ngẫu nhiên thẻ"
          >
            <Shuffle size={17} />
          </button>

          <span className="vintage-fc-bar-sep" aria-hidden="true" />

          {/* Restart Button */}
          <button
            type="button"
            className="vintage-fc-tool-btn"
            onClick={handleRestart}
            title="Bắt đầu lại từ đầu"
            aria-label="Bắt đầu lại"
          >
            <RotateCcw size={17} />
          </button>

          <span className="vintage-fc-bar-sep" aria-hidden="true" />

          {/* Zen Mode Button inside Capsule */}
          <button
            type="button"
            className={`vintage-fc-tool-btn is-active-moss ${isZenMode ? 'is-active' : ''}`}
            onClick={() => setIsZenMode(!isZenMode)}
            title={isZenMode ? 'Thoát chế độ tập trung (Esc)' : 'Chế độ tập trung Zen Mode'}
            aria-label="Chế độ tập trung"
          >
            {isZenMode ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>

          <span className="vintage-fc-capsule-ornament" aria-hidden="true">◆</span>
        </div>

        {/* Right Circular Next Button + Standalone Zen Button */}
        <div className="vintage-fc-right-nav-group">
          <button
            type="button"
            className="vintage-card-nav-arrow is-next"
            onClick={handleNext}
            disabled={currentIndex >= totalCount - 1}
            title="Thẻ tiếp theo (→)"
            aria-label="Thẻ tiếp theo"
          >
            <ChevronRight size={22} />
          </button>

          <button
            type="button"
            className={`vintage-fc-side-zen-btn ${isZenMode ? 'is-active' : ''}`}
            onClick={() => setIsZenMode(!isZenMode)}
            title={isZenMode ? 'Thoát chế độ tập trung (Esc)' : 'Phóng to thẻ (Zen Mode)'}
            aria-label="Phóng to thẻ"
          >
            {isZenMode ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </div>

      {/* 3. Hotkeys Legend Strip */}
      <div className="vintage-fc-pill-legend-row">
        <img
          src="/assets/flashcard/flashcard-bottom-pill.png"
          alt=""
          className="vintage-fc-pill-wing is-left"
        />
        <div className="vintage-fc-pill-legend">
          <span>
            <kbd>Space</kbd> Lật thẻ
          </span>
          <span className="vintage-fc-pill-divider">|</span>
          <span>
            <kbd>←</kbd> <kbd>→</kbd> Chuyển thẻ
          </span>
          <span className="vintage-fc-pill-divider">|</span>
          <span>
            <kbd>Esc</kbd> Thoát Zen
          </span>
        </div>
        <img
          src="/assets/flashcard/flashcard-bottom-pill.png"
          alt=""
          className="vintage-fc-pill-wing is-right"
        />
      </div>
    </div>
  );
}
