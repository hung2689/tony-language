import { useState, useEffect, useRef } from 'react';
import { Settings, AlertCircle } from 'lucide-react';
import { speakEnglishTerm } from '../../utils/speechUtils';

export default function LearnQuestion({
  deck,
  currentQuestion,
  sessionStats,
  distinctCardCount,
  nudge,
  options,
  onOpenSettings,
  onSubmitAnswer,
  onSkipQuestion,
  onExit,
}) {
  const attemptsCount = currentQuestion?.attempts ?? currentQuestion?.attemptNo ?? 0;
  const currentKey = `${currentQuestion?.cardId}-${attemptsCount}`;
  const [inputVal, setInputVal] = useState('');
  const [prevQuestionKey, setPrevQuestionKey] = useState(currentKey);
  const inputRef = useRef(null);
  const startTimeRef = useRef(null);

  if (prevQuestionKey !== currentKey) {
    setPrevQuestionKey(currentKey);
    setInputVal('');
  }

  const { card, direction } = currentQuestion;
  const isViToEn = direction === 'VI_TO_EN';
  const targetLang = isViToEn ? 'en' : 'vi';

  // Autofocus input on every new question
  useEffect(() => {
    startTimeRef.current = Date.now();
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Auto speak English term if visible (Anh -> Việt) and autoSpeak is on
    if (!isViToEn && options?.autoSpeak && card?.term) {
      speakEnglishTerm(card.term);
    }

    return () => {
      // Cancel speech on unmount
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentQuestion.cardId, attemptsCount, isViToEn, card?.term, options?.autoSpeak]);

  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    const responseTimeMs = Date.now() - startTimeRef.current;
    onSubmitAnswer(trimmed, responseTimeMs);
  };

  const handleSkip = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const responseTimeMs = Date.now() - startTimeRef.current;
    onSkipQuestion(responseTimeMs);
  };

  const handleKeyDown = (e) => {
    // IME safety: ignore Enter during composition (Telex / VNI)
    if (e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229) {
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (inputVal.trim()) {
        handleSubmit(e);
      }
    }
  };

  const handleSpeakTerm = (e) => {
    e.stopPropagation();
    if (card?.term) {
      speakEnglishTerm(card.term);
    }
  };

  // Voyage Progress calculation
  const totalWords = sessionStats?.totalWords ?? sessionStats?.totalCards ?? 1;
  const masteredWords = sessionStats?.masteredWords ?? sessionStats?.masteredCount ?? 0;
  const fillRatio = totalWords > 0 ? Math.min(1, Math.max(0, masteredWords / totalWords)) : 0;
  const percent = Math.round(fillRatio * 100);

  // Card mastery level (0 to 3)
  const masteryLevel = currentQuestion.masteryLevel || 0;

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

      {/* Voyage Nautical Progress Bar: [⚓ Bến] ───⛵─── [🏝 Đảo Kho Báu] */}
      <div
        className="vintage-voyage-progress-container"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
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

      {/* Main Question Parchment Scroll */}
      <main className="vintage-question-scroll-wrapper">
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

        {/* Top Meta Row */}
        <div className="vintage-card-top-row">
          <div className="vintage-card-type-tag">
            {isViToEn ? '📖 Định nghĩa tiếng Việt' : '🧭 Thuật ngữ tiếng Anh'}
          </div>

          {/* Retention Mastery Indicator (3 Wax Coins / Dots) */}
          <div
            className="vintage-mastery-indicator"
            title={`Mức độ thành thạo: ${masteryLevel}/3`}
          >
            <span className="vintage-mastery-text">Đã thuộc: {masteryLevel}/3</span>
            <div className="vintage-mastery-dots">
              {[1, 2, 3].map((level) => (
                <span
                  key={level}
                  className={`vintage-mastery-dot ${masteryLevel >= level ? 'is-active' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Prompt Section */}
        <div className="vintage-prompt-area">
          <div className="vintage-prompt-header">
            <h2 className="vintage-prompt-text">
              {isViToEn ? card.definition : card.term}
            </h2>

            {/* Speaker icon always available when English term is shown */}
            {!isViToEn && (
              <button
                type="button"
                className="vintage-sound-btn"
                onClick={handleSpeakTerm}
                title="Nghe phát âm"
                aria-label="Nghe phát âm tiếng Anh"
              >
                <img src="/assets/flashcard/flashcard-sound.png" alt="Phát âm" />
              </button>
            )}
          </div>

          {/* Subtitle meta: never leak IPA/example for Việt -> Anh */}
          {isViToEn ? (
            card.partOfSpeech && (
              <div className="vintage-meta-text">
                <span className="vintage-pos-badge">{card.partOfSpeech}</span>
              </div>
            )
          ) : (
            <div className="vintage-meta-text">
              {card.partOfSpeech && <span>{card.partOfSpeech}</span>}
              {card.partOfSpeech && card.pronunciation && <span> · </span>}
              {card.pronunciation && <span>/{card.pronunciation}/</span>}
            </div>
          )}
        </div>

        {/* Nudge Alert if 'almost' */}
        {nudge && (
          <div className="vintage-nudge-box" role="alert">
            <AlertCircle size={18} className="vintage-nudge-icon" />
            <span className="vintage-nudge-text">
              {typeof nudge === 'object' ? (nudge.message || nudge.reason || '') : nudge}
            </span>
          </div>
        )}

        {/* Antique Quill & Ink Input Form */}
        <form onSubmit={handleSubmit} className="vintage-answer-form">
          <div className="vintage-input-group">
            <label htmlFor="learn-answer-input" className="visually-hidden">
              Câu trả lời của bạn
            </label>
            <input
              ref={inputRef}
              id="learn-answer-input"
              type="text"
              className={`vintage-answer-input ${nudge ? 'is-nudged' : ''}`}
              placeholder="Gõ câu trả lời của bạn vào đây..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              lang={targetLang}
            />
          </div>

          <div className="vintage-action-buttons">
            <button
              type="submit"
              className={`vintage-submit-btn ${inputVal.trim() ? 'is-active' : 'is-disabled'}`}
              disabled={!inputVal.trim()}
            >
              <span>Kiểm tra</span>
              <kbd className="vintage-key-badge">↵</kbd>
            </button>

            <button
              type="button"
              className="vintage-skip-btn"
              onClick={handleSkip}
            >
              <span>Tôi chưa biết</span>
            </button>
          </div>
        </form>
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
