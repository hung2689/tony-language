import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Settings, Volume2, AlertCircle } from 'lucide-react';
import { speakEnglishTerm } from '../../utils/speechUtils';

export default function LearnQuestion({
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

  // Progress bar: 10 equal segments with accurate fillRatio calculation
  const totalWords = sessionStats?.totalWords ?? sessionStats?.totalCards ?? 1;
  const masteredWords = sessionStats?.masteredWords ?? sessionStats?.masteredCount ?? 0;
  const totalCards = totalWords;
  const masteredCount = masteredWords;
  const fillRatio = totalWords > 0 ? masteredWords / totalWords : 0;
  const filledCount = Math.round(fillRatio * 10);
  const segments = Array.from({ length: 10 }, (_, i) => i < filledCount);

  // Card mastery level (0 to 3)
  const masteryLevel = currentQuestion.masteryLevel || 0;

  return (
    <div className="learn-session-wrapper">
      {/* Top Bar */}
      <header className="learn-top-bar">
        <button
          type="button"
          className="learn-back-btn"
          onClick={onExit}
          aria-label="Thoát phiên học"
        >
          <ArrowLeft size={18} />
          <span>Thoát</span>
        </button>

        <div className="learn-top-bar-center" />

        <button
          type="button"
          className="learn-settings-trigger-btn"
          onClick={onOpenSettings}
          aria-label="Cài đặt phiên học"
        >
          <Settings size={18} />
          <span>Cài đặt</span>
        </button>
      </header>

      {/* Segmented Progress Bar (10 equal segments, accessible aria values) */}
      <div
        className="learn-progress-container"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fillRatio * 100)}
        aria-label="Tiến độ học tập"
      >
        <div className="learn-progress-segments">
          {segments.map((isFilled, idx) => (
            <div
              key={idx}
              className={`learn-progress-segment ${isFilled ? 'is-filled' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Main Question Card */}
      <main className="learn-question-card">
        <div className="learn-card-top-row">
          <div className="learn-card-badge">
            {isViToEn ? 'Định nghĩa' : 'Thuật ngữ'}
          </div>

          {/* Retention Mastery Indicator (3 mini-dots) */}
          <div className="learn-mastery-indicator" title={`Mức độ thành thạo: ${masteryLevel}/3`}>
            <span className="learn-mastery-text">Đã thuộc: {masteryLevel}/3</span>
            <div className="learn-mastery-dots">
              {[1, 2, 3].map((level) => (
                <span
                  key={level}
                  className={`learn-mastery-dot ${masteryLevel >= level ? 'is-active' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Prompt Section */}
        <div className="learn-prompt-area">
          <div className="learn-prompt-header">
            <h2 className="learn-prompt-text">
              {isViToEn ? card.definition : card.term}
            </h2>

            {/* Speaker icon always available when English term is shown */}
            {!isViToEn && (
              <button
                type="button"
                className="learn-audio-btn"
                onClick={handleSpeakTerm}
                title="Nghe phát âm"
                aria-label="Nghe phát âm tiếng Anh"
              >
                <Volume2 size={22} />
              </button>
            )}
          </div>

          {/* Subtitle meta: never leak IPA/example for Việt -> Anh */}
          {isViToEn ? (
            card.partOfSpeech && (
              <div className="learn-meta-text">
                <span className="learn-pos-badge">{card.partOfSpeech}</span>
              </div>
            )
          ) : (
            <div className="learn-meta-text">
              {card.partOfSpeech && <span>{card.partOfSpeech}</span>}
              {card.partOfSpeech && card.pronunciation && <span> · </span>}
              {card.pronunciation && <span>/{card.pronunciation}/</span>}
            </div>
          )}
        </div>

        {/* Nudge Alert if 'almost' */}
        {nudge && (
          <div className="learn-nudge-box" role="alert">
            <AlertCircle size={18} className="learn-nudge-icon" />
            <span className="learn-nudge-text">
              {typeof nudge === 'object' ? (nudge.message || nudge.reason || '') : nudge}
            </span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="learn-answer-form">
          <div className="learn-input-group">
            <label htmlFor="learn-answer-input" className="visually-hidden">
              Câu trả lời của bạn
            </label>
            <input
              ref={inputRef}
              id="learn-answer-input"
              type="text"
              className={`learn-answer-input ${nudge ? 'is-nudged' : ''}`}
              placeholder="Nhập câu trả lời của bạn..."
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

          <div className="learn-action-buttons">
            <button
              type="submit"
              className={`learn-submit-btn ${inputVal.trim() ? 'is-active' : 'is-disabled'}`}
              disabled={!inputVal.trim()}
            >
              <span>Kiểm tra</span>
              <kbd className="learn-key-badge">↵</kbd>
            </button>

            <button
              type="button"
              className="learn-skip-btn"
              onClick={handleSkip}
            >
              <span>Tôi không biết</span>
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="learn-session-footer">
        <span>
          Đã hoàn thành: {masteredCount} / {totalCards}
        </span>
        <span className="learn-footer-divider">•</span>
        <span>
          Câu hỏi: {distinctCardCount} / {totalCards}
        </span>
      </footer>
    </div>
  );
}
