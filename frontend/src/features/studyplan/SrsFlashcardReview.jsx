import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { speakEnglishTerm } from '../../utils/speechUtils';
import './SrsFlashcardReview.css';

function formatDaysAgo(timestamp) {
  if (!timestamp) return 'Chưa ôn lần nào';
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  return `${diffDays} ngày trước`;
}

export default function SrsFlashcardReview({
  cards = [],
  onRateCard,
  onComplete,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  const currentCard = cards[currentIndex] || null;
  const isStudied = (currentCard?.repetitions || 0) > 0;
  const timeBadge = useMemo(() => {
    return formatDaysAgo(currentCard?.lastReviewedAt);
  }, [currentCard?.lastReviewedAt]);

  const wordTerm = currentCard?.term || currentCard?.word || '';
  const wordDefinition = currentCard?.definition || currentCard?.meaning || '';
  const pos = currentCard?.partOfSpeech || currentCard?.wordType || '';
  const rawIpa = currentCard?.pronunciation || '';
  const ipaText = rawIpa ? `/${rawIpa.replace(/^\/+|\/+$/g, '')}/` : '';
  const example = currentCard?.example || currentCard?.exampleSentence || '';

  let synonymsList = [];
  if (Array.isArray(currentCard?.synonyms)) {
    synonymsList = currentCard.synonyms;
  } else if (typeof currentCard?.synonyms === 'string') {
    synonymsList = currentCard.synonyms
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

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
    if (deltaTime < 500 && Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX > 0) {
        // Swipe Right -> Remembered well (GOOD)
        handleRate('GOOD');
      } else {
        // Swipe Left -> Forgot (AGAIN)
        handleRate('AGAIN');
      }
    }
  };

  const handleSpeak = useCallback(
    (e, text) => {
      e?.stopPropagation();
      const textToSpeak = text || wordTerm;
      if (textToSpeak) {
        speakEnglishTerm(textToSpeak);
      }
    },
    [wordTerm]
  );

  const handleRate = useCallback(
    (rating) => {
      if (!currentCard) return;

      onRateCard?.(currentCard.id, rating);

      // Advance to next card or complete
      if (currentIndex + 1 < cards.length) {
        setIsFlipped(false);
        setCurrentIndex((prev) => prev + 1);
      } else {
        onComplete?.();
      }
    },
    [currentCard, currentIndex, cards.length, onRateCard, onComplete]
  );

  // Keyboard shortcut listener
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === '1') {
        e.preventDefault();
        handleRate('AGAIN');
      } else if (e.key === '2') {
        e.preventDefault();
        handleRate('HARD');
      } else if (e.key === '3') {
        e.preventDefault();
        handleRate('GOOD');
      } else if (e.key === '4') {
        e.preventDefault();
        handleRate('EASY');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleRate]);

  if (!currentCard) {
    return (
      <div className="deck-empty-cards-box" style={{ background: '#FAF1DE', border: '1.5px dashed #A68D6C', borderRadius: '12px', padding: '36px', textAlign: 'center' }}>
        <p style={{ color: '#5C4F3E', fontFamily: 'Georgia, serif' }}>Không có thẻ từ vựng nào cần hiển thị.</p>
      </div>
    );
  }

  return (
    <div className="vintage-flashcard-experience srs-vintage-experience">
      {/* 1. Main Vintage 3D Flashcard Scene */}
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
                  {isStudied ? 'Ôn tập' : 'Mặt trước'}
                </span>
              </div>

              {/* Top-Right: Sound Trigger */}
              <button
                type="button"
                className="vintage-fc-sound-btn"
                onClick={(e) => handleSpeak(e, wordTerm)}
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
                <h2 className="vintage-fc-main-term">{wordTerm}</h2>
                {(pos || ipaText) && (
                  <p className="vintage-fc-meta">
                    {ipaText && <span className="vintage-fc-ipa">{ipaText}</span>}
                    {pos && ipaText && <span className="vintage-fc-meta-sep"> · </span>}
                    {pos && <span className="vintage-fc-pos">{pos}</span>}
                  </p>
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
                <span className="vintage-fc-label-text">Mặt sau</span>
              </div>

              {/* Top-Right: Sound Trigger */}
              <button
                type="button"
                className="vintage-fc-sound-btn"
                onClick={(e) => handleSpeak(e, wordTerm)}
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
                <h2 className="vintage-fc-main-def">{wordDefinition}</h2>

                {example && (
                  <blockquote className="vintage-fc-example">
                    “{example}”
                  </blockquote>
                )}

                {synonymsList.length > 0 && (
                  <div className="vintage-fc-synonyms">
                    <span className="vintage-fc-syn-label">Từ đồng nghĩa: </span>
                    <span className="vintage-fc-syn-values">{synonymsList.join(' · ')}</span>
                  </div>
                )}

                <div className="vintage-fc-reminder">
                  <span className="vintage-fc-reminder-word">{wordTerm}</span>
                  {ipaText && <span className="vintage-fc-reminder-ipa"> ({ipaText})</span>}
                </div>
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

      {/* 2. Vintage Central Progress Capsule */}
      <div className="vintage-fc-controls-bar srs-vintage-controls-bar">
        <span className="vintage-fc-capsule-ornament" aria-hidden="true">◆</span>

        <span className="vintage-fc-counter" title="Tiến độ hàng đợi ôn tập">
          {currentIndex + 1} / {cards.length}
        </span>

        <span className="vintage-fc-bar-sep" aria-hidden="true" />

        <span className="vintage-srs-status-badge">
          {isStudied ? `Ôn tập (${timeBadge})` : 'Từ mới'}
        </span>

        <span className="vintage-fc-capsule-ornament" aria-hidden="true">◆</span>
      </div>

      {/* 3. Vintage 4-Level SRS Rating Buttons */}
      <div className="vintage-srs-rating-container">
        <p className="vintage-srs-rating-hint">
          Nhấn <kbd className="vintage-srs-kbd-inline">Space</kbd> để lật thẻ · Phím <kbd className="vintage-srs-kbd-inline">1</kbd>–<kbd className="vintage-srs-kbd-inline">4</kbd> để đánh giá độ nhớ · Vuốt trái / phải trên điện thoại
        </p>

        <div className="vintage-srs-rating-grid">
          <button
            type="button"
            className="vintage-srs-rating-btn is-again"
            onClick={() => handleRate('AGAIN')}
            title="Quên từ (Phím 1 hoặc Vuốt trái)"
          >
            <span className="vintage-srs-btn-label">Quên</span>
            <kbd className="vintage-srs-kbd">1</kbd>
          </button>

          <button
            type="button"
            className="vintage-srs-rating-btn is-hard"
            onClick={() => handleRate('HARD')}
            title="Khó nhớ (Phím 2)"
          >
            <span className="vintage-srs-btn-label">Khó</span>
            <kbd className="vintage-srs-kbd">2</kbd>
          </button>

          <button
            type="button"
            className="vintage-srs-rating-btn is-good"
            onClick={() => handleRate('GOOD')}
            title="Nhớ tốt (Phím 3 hoặc Vuốt phải)"
          >
            <span className="vintage-srs-btn-label">Tốt</span>
            <kbd className="vintage-srs-kbd">3</kbd>
          </button>

          <button
            type="button"
            className="vintage-srs-rating-btn is-easy"
            onClick={() => handleRate('EASY')}
            title="Rất dễ (Phím 4)"
          >
            <span className="vintage-srs-btn-label">Dễ</span>
            <kbd className="vintage-srs-kbd">4</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
