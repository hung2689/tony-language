import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Volume2, Mic, RotateCcw } from 'lucide-react';
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
  const [showIpa, setShowIpa] = useState(true);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  const currentCard = cards[currentIndex] || null;
  const isStudied = (currentCard?.repetitions || 0) > 0;
  const timeBadge = useMemo(() => {
    return formatDaysAgo(currentCard?.lastReviewedAt);
  }, [currentCard?.lastReviewedAt]);

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

  const handleSpeak = useCallback((e) => {
    e?.stopPropagation();
    if (currentCard?.term || currentCard?.word) {
      speakEnglishTerm(currentCard.term || currentCard.word);
    }
  }, [currentCard]);

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
      <div className="srs-flashcard-container">
        <p>Không có từ vựng nào để hiển thị.</p>
      </div>
    );
  }

  const wordTerm = currentCard.term || currentCard.word || '';
  const wordDefinition = currentCard.definition || currentCard.meaning || '';
  const pos = currentCard.partOfSpeech || currentCard.wordType || '';
  const pronunciation = currentCard.pronunciation || '';
  const example = currentCard.example || currentCard.exampleSentence || '';

  return (
    <div className="srs-flashcard-container">
      {/* 3D Flashcard */}
      <div
        className="srs-flashcard-card-wrapper"
        onClick={handleFlip}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="button"
        tabIndex={0}
        aria-label="Lật thẻ từ vựng"
      >
        <div className={`srs-flashcard-card-inner ${isFlipped ? 'is-flipped' : ''}`}>
          {/* Front Face */}
          <div className="srs-flashcard-face srs-flashcard-face--front">
            <div className="srs-card-top-row">
              <div className="srs-card-badges">
                <span className={`srs-badge ${isStudied ? 'srs-badge--studied' : 'srs-badge--new'}`}>
                  {isStudied ? 'Đã học' : 'Từ mới'}
                </span>
                {isStudied && (
                  <span className="srs-badge srs-badge--time">{timeBadge}</span>
                )}
              </div>

              <span className="srs-card-counter">
                {currentIndex + 1} / {cards.length}
              </span>
            </div>

            <div className="srs-card-center-content">
              <h2 className="srs-card-main-term">{wordTerm}</h2>

              {(pos || pronunciation) && (
                <div className="srs-card-meta-line">
                  {pos && <span className="srs-card-pos">{pos}</span>}
                  {pos && pronunciation && <span>·</span>}
                  {pronunciation && showIpa && <span>/{pronunciation}/</span>}
                </div>
              )}
            </div>

            <div className="srs-card-bottom-row">
              <div className="srs-audio-pill-box">
                <button
                  type="button"
                  className="srs-card-icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Mic toggle
                  }}
                  title="Luyện nói"
                  aria-label="Luyện nói"
                >
                  <Mic size={17} />
                </button>

                <button
                  type="button"
                  className={`srs-card-icon-btn ${showIpa ? 'is-active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowIpa((prev) => !prev);
                  }}
                  title="Bật/tắt phiên âm"
                  aria-label="Bật/tắt phiên âm"
                >
                  <span style={{ fontSize: '11px', fontWeight: 700 }}>IPA</span>
                </button>

                <button
                  type="button"
                  className="srs-card-icon-btn"
                  onClick={handleSpeak}
                  title="Nghe phát âm"
                  aria-label="Nghe phát âm"
                >
                  <Volume2 size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Back Face */}
          <div className="srs-flashcard-face srs-flashcard-face--back">
            <div className="srs-card-top-row">
              <div className="srs-card-badges">
                <span className={`srs-badge ${isStudied ? 'srs-badge--studied' : 'srs-badge--new'}`}>
                  {isStudied ? 'Đã học' : 'Từ mới'}
                </span>
                {isStudied && (
                  <span className="srs-badge srs-badge--time">{timeBadge}</span>
                )}
              </div>

              <span className="srs-card-counter">
                {currentIndex + 1} / {cards.length}
              </span>
            </div>

            <div className="srs-card-center-content">
              <p className="srs-card-meaning">{wordDefinition}</p>
              {example && <p className="srs-card-example">"{example}"</p>}
            </div>

            <div className="srs-card-bottom-row">
              <button
                type="button"
                className="srs-card-icon-btn"
                onClick={handleSpeak}
                title="Nghe lại phát âm"
              >
                <Volume2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Level Rating Bar */}
      <div className="srs-rating-section">
        <div className="srs-rating-header-row">
          <span className="srs-rating-heading">Đánh giá độ nhớ</span>
          <span className="srs-rating-hint-text">Vuốt trái: Quên · Vuốt phải: Tốt</span>
        </div>

        <div className="srs-rating-buttons-grid">
          <button
            type="button"
            className="srs-rating-btn srs-rating-btn--again"
            onClick={() => handleRate('AGAIN')}
            title="Quên từ (Phím 1)"
          >
            <span className="srs-rating-label">Quên</span>
            <kbd className="srs-kbd">1</kbd>
          </button>

          <button
            type="button"
            className="srs-rating-btn srs-rating-btn--hard"
            onClick={() => handleRate('HARD')}
            title="Khó nhớ (Phím 2)"
          >
            <span className="srs-rating-label">Khó</span>
            <kbd className="srs-kbd">2</kbd>
          </button>

          <button
            type="button"
            className="srs-rating-btn srs-rating-btn--good"
            onClick={() => handleRate('GOOD')}
            title="Nhớ tốt (Phím 3)"
          >
            <span className="srs-rating-label">Tốt</span>
            <kbd className="srs-kbd">3</kbd>
          </button>

          <button
            type="button"
            className="srs-rating-btn srs-rating-btn--easy"
            onClick={() => handleRate('EASY')}
            title="Rất dễ (Phím 4)"
          >
            <span className="srs-rating-label">Dễ</span>
            <kbd className="srs-kbd">4</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
