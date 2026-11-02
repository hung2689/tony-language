import { useEffect, useRef, useCallback } from 'react';
import { Settings, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { speakEnglishTerm } from '../../utils/speechUtils';
import { playCorrectSound, playWrongSound } from '../../utils/soundEffects';

export default function LearnFeedback({
  deck,
  feedback,
  currentQuestion: _currentQuestion,
  sessionStats,
  distinctCardCount,
  options,
  onOpenSettings,
  onNextQuestion,
  onOverride,
  onExit,
}) {
  const { result, userAnswer, correctAnswer, card, override, alsoCorrect, note, direction } = feedback;
  const isAccepted = result === 'accepted';
  const isCorrect = result === 'correct' || isAccepted;
  const isSkipped = result === 'skipped';
  const isViToEn = direction === 'VI_TO_EN';

  // Normalize synonyms list from card (array or delimiter string)
  let synonymsList = [];
  if (Array.isArray(card?.synonyms)) {
    synonymsList = card.synonyms.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
  } else if (typeof card?.synonyms === 'string') {
    synonymsList = card.synonyms.split(/[;,]+/).map((s) => s.trim()).filter(Boolean);
  } else if (typeof card?.rawSynonyms === 'string') {
    synonymsList = card.rawSynonyms.split(/[;,]+/).map((s) => s.trim()).filter(Boolean);
  }
  const autoAdvanceTimerRef = useRef(null);
  const canAdvanceRef = useRef(false);
  const onNextRef = useRef(onNextQuestion);

  // Keep latest onNextQuestion in ref to avoid stale closures (BUG-13)
  useEffect(() => {
    onNextRef.current = onNextQuestion;
  });

  // Grace period (350ms) so Enter keydown from submitting doesn't trigger advance instantly
  useEffect(() => {
    canAdvanceRef.current = false;
    const timer = setTimeout(() => {
      canAdvanceRef.current = true;
    }, 350);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Audio and speech effects
  useEffect(() => {
    // 1. Sound effects
    if (options?.soundEffects) {
      if (isCorrect) {
        playCorrectSound();
      } else {
        playWrongSound();
      }
    }

    // 2. Speak English term aloud if enabled
    if (options?.autoSpeak && card?.term) {
      speakEnglishTerm(card.term);
    }

    // 3. Auto-advance for correct answers if enabled
    if (isCorrect && options?.autoAdvance) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        onNextRef.current?.();
      }, 2000);
    }

    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [feedback, isCorrect, options?.soundEffects, options?.autoSpeak, options?.autoAdvance, card?.term]);

  const handleNext = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    onNextRef.current?.();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!canAdvanceRef.current) return;
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext]);

  const handleSpeakTerm = (e) => {
    e.stopPropagation();
    if (card?.term) {
      speakEnglishTerm(card.term);
    }
  };

  // Progress bar calculation
  const totalWords = sessionStats?.totalWords ?? sessionStats?.totalCards ?? 1;
  const masteredWords = sessionStats?.masteredWords ?? sessionStats?.masteredCount ?? 0;
  const fillRatio = totalWords > 0 ? Math.min(1, Math.max(0, masteredWords / totalWords)) : 0;
  const percent = Math.round(fillRatio * 100);

  return (
    <div className="learn-session-wrapper vintage-learn-container">
      {/* Top Header Row with Vintage Pirate Navigation */}
      <header className="vintage-deck-header-row learn-vintage-header">
        {/* Left: Vintage Back Button */}
        <button
          type="button"
          className="vintage-header-back-btn"
          onClick={onExit}
          title="Thoát phiên học"
          aria-label="Thoát phiên học"
        >
          <img src="/assets/flashcard/button-back.png" alt="Thoát" />
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
            <h1 className="vintage-ribbon-text">{deck?.name || 'Hải trình Học tập'}</h1>
          </div>
          <span className="vintage-title-flourish is-right" aria-hidden="true">
            <span className="flourish-dot">•</span>
            <span className="flourish-diamond">◆</span>
            <span className="flourish-line" />
          </span>
        </div>

        {/* Right: Vintage Settings Button */}
        <button
          type="button"
          className="vintage-header-settings-btn"
          onClick={onOpenSettings}
          title="Cài đặt phiên học"
          aria-label="Cài đặt phiên học"
        >
          <Settings size={18} />
          <span>Cài đặt</span>
        </button>
      </header>

      {/* Voyage Nautical Progress Bar */}
      <div
        className="vintage-voyage-progress-container"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tiến độ hải trình"
      >
        <div className="vintage-voyage-track">
          <div className="voyage-landmark start-harbor" title="Bến xuất phát">
            <span className="landmark-icon">⚓</span>
            <span className="landmark-label">Bến Cảng</span>
          </div>

          <div className="voyage-sea-line">
            <div
              className="voyage-sea-progress"
              style={{ width: `${percent}%` }}
            />
            <div
              className="voyage-ship-marker"
              style={{ left: `${percent}%` }}
              title={`Đã thuộc: ${masteredWords}/${totalWords} từ`}
            >
              <img
                src="/assets/flashcard/flashcard-ship.png"
                alt="Thuyền thám hiểm"
                className="voyage-ship-img"
              />
            </div>
          </div>

          <div className="voyage-landmark end-island" title="Đảo Kho Báu">
            <span className="landmark-icon">🏝</span>
            <span className="landmark-label">Kho Báu</span>
          </div>
        </div>

        <div className="voyage-progress-counter">
          <span>Tiến độ: <strong>{masteredWords}</strong> / {totalWords} từ đã thuộc ({percent}%)</span>
        </div>
      </div>

      {/* Main Feedback Parchment Scroll */}
      <main className="vintage-question-scroll-wrapper vintage-feedback-scroll" aria-live="polite">
        {/* Antique Corner Illustrations */}
        <img
          src="/assets/flashcard/flashcard-compass.png"
          alt=""
          className="vintage-corner-compass"
          aria-hidden="true"
        />
        <img
          src="/assets/flashcard/flashcard-landscape.png"
          alt=""
          className="vintage-corner-landscape"
          aria-hidden="true"
        />

        {/* Result Card: Adventure / Vintage Parchment */}
        <div className={`vintage-feedback-card ${isCorrect ? 'is-seal-correct' : 'is-seal-wrong'}`}>
          {/* A. Trạng thái trả lời */}
          <div className="vintage-feedback-status-row">
            {isCorrect ? (
              <>
                <CheckCircle2 size={24} className="vintage-status-icon is-correct" />
                <span className="vintage-status-title is-correct">
                  {override ? 'Đã ghi nhận đúng!' : isAccepted ? 'Được chấp nhận!' : 'Chính xác!'}
                </span>
              </>
            ) : (
              <>
                <XCircle size={24} className="vintage-status-icon is-wrong" />
                <span className="vintage-status-title is-wrong">Chưa đúng</span>
              </>
            )}
          </div>

          {/* B, C, D: Phân cấp thông tin trực quan */}
          <div className="vintage-feedback-rows">
            {/* B. Bạn trả lời (gạch ngang màu đỏ nếu trả lời sai) */}
            {!isCorrect && (
              <div className="vintage-feedback-line vintage-user-answer-line">
                <span className="vintage-line-label">Bạn trả lời:</span>
                <span className="vintage-wrong-answer-strikethrough">
                  {userAnswer ? userAnswer : '(Tôi chưa biết)'}
                </span>
              </div>
            )}

            {/* C. Đáp án chính xác theo chiều học */}
            {isViToEn ? (
              // Chiều Việt -> Anh: Đáp án đúng là từ tiếng Anh
              <div className="vintage-feedback-line vintage-correct-answer-line">
                <span className="vintage-line-label">Đáp án:</span>
                <div className="vintage-answer-main-group">
                  <span className="vintage-english-term-hero">
                    {card?.term || correctAnswer}
                  </span>
                  {card?.term && (
                    <button
                      type="button"
                      className="vintage-speaker-btn"
                      onClick={handleSpeakTerm}
                      title="Nghe phát âm tiếng Anh"
                      aria-label="Nghe phát âm tiếng Anh"
                    >
                      <img src="/assets/flashcard/flashcard-sound.png" alt="Phát âm" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // Chiều Anh -> Việt: Đáp án đúng là nghĩa tiếng Việt, sau đó hiển thị từ tiếng Anh kèm loa
              <>
                <div className="vintage-feedback-line vintage-correct-answer-line">
                  <span className="vintage-line-label">Đáp án:</span>
                  <div className="vintage-answer-main-group">
                    <span className="vintage-correct-meaning-val">
                      {correctAnswer || card?.definition}
                    </span>
                  </div>
                </div>

                <div className="vintage-feedback-line vintage-english-term-line">
                  <span className="vintage-line-label">Từ tiếng Anh:</span>
                  <div className="vintage-answer-main-group">
                    <span className="vintage-english-term-hero">
                      {card?.term}
                    </span>
                    {card?.term && (
                      <button
                        type="button"
                        className="vintage-speaker-btn"
                        onClick={handleSpeakTerm}
                        title="Nghe phát âm tiếng Anh"
                        aria-label="Nghe phát âm tiếng Anh"
                      >
                        <img src="/assets/flashcard/flashcard-sound.png" alt="Phát âm" />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* D. Từ đồng nghĩa: hiển thị trên cùng 1 dòng ngăn cách bằng ' · ' */}
            {synonymsList.length > 0 && (
              <div className="vintage-feedback-line vintage-synonyms-line">
                <span className="vintage-line-label">Từ đồng nghĩa:</span>
                <span className="vintage-synonyms-list">
                  {synonymsList.join(' · ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* E. Nút tiếp tục & Override */}
        <div className="vintage-feedback-footer-actions">
          <button
            type="button"
            className="vintage-feedback-continue-btn"
            onClick={handleNext}
          >
            <span>Tiếp tục</span>
            <ArrowRight size={18} />
            <kbd className="vintage-key-pill">↵</kbd>
          </button>

          {!isCorrect && onOverride && (
            <button
              type="button"
              className="vintage-override-text-btn"
              onClick={onOverride}
            >
              <span>✏ Câu trả lời của tôi lẽ ra nên được chấp nhận</span>
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="vintage-session-footer">
        <span>
          Hải trình: {distinctCardCount} / {totalWords} từ khảo nghiệm
        </span>
        <span className="vintage-footer-divider">•</span>
        <span>
          Đã thành thạo: {masteredWords} / {totalWords} từ
        </span>
      </footer>
    </div>
  );
}
