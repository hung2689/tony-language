import { useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Settings, CheckCircle2, XCircle, Volume2, ArrowRight } from 'lucide-react';
import { speakEnglishTerm } from '../../utils/speechUtils';
import { playCorrectSound, playWrongSound } from '../../utils/soundEffects';

export default function LearnFeedback({
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
  const { result, userAnswer, correctAnswer, card, override, alsoCorrect, note } = feedback;
  const isAccepted = result === 'accepted';
  const isCorrect = result === 'correct' || isAccepted;
  const isSkipped = result === 'skipped';
  const autoAdvanceTimerRef = useRef(null);
  const canAdvanceRef = useRef(false);
  const onNextRef = useRef(onNextQuestion);

  // Keep latest onNextQuestion in ref to avoid stale closures (BUG-13)
  useEffect(() => {
    onNextRef.current = onNextQuestion;
  });

  // Enable advancing after a brief grace period (350ms) so Enter keydown from submitting does not leak
  useEffect(() => {
    canAdvanceRef.current = false;
    const timer = setTimeout(() => {
      canAdvanceRef.current = true;
    }, 350);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Play audio sound and speech on mount
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

    // 3. Auto-advance for correct answers only if user explicitly turned on autoAdvance
    if (isCorrect && options?.autoAdvance) {
      // Auto-advance after 2s
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
  const totalCards = sessionStats?.totalWords ?? sessionStats?.totalCards ?? 1;
  const masteredCount = sessionStats?.masteredWords ?? sessionStats?.masteredCount ?? 0;
  const numSegments = Math.min(10, totalCards);
  const segments = Array.from({ length: numSegments }, (_, i) => {
    const threshold = ((i + 1) / numSegments) * totalCards;
    return masteredCount >= threshold;
  });

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

      {/* Progress Bar */}
      <div
        className="learn-progress-container"
        role="progressbar"
        aria-valuenow={masteredCount}
        aria-valuemin="0"
        aria-valuemax={totalCards}
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

      {/* Main Feedback Card */}
      <main className="learn-question-card" aria-live="polite">
        <div className={`learn-feedback-banner ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
          <div className="learn-feedback-header">
            {isCorrect ? (
              <CheckCircle2 size={24} className="learn-feedback-icon" />
            ) : (
              <XCircle size={24} className="learn-feedback-icon" />
            )}
            <span className="learn-feedback-title">
              {isCorrect
                ? override
                  ? 'Đã ghi nhận đúng!'
                  : isAccepted
                  ? 'Được chấp nhận!'
                  : 'Chính xác!'
                : 'Chưa đúng'}
            </span>
          </div>

          {/* Details */}
          <div className="learn-feedback-details">
            {note && (
              <div className="learn-feedback-row learn-accepted-note" style={{ color: '#a7f3d0' }}>
                <span className="learn-feedback-lbl" style={{ color: '#6ee7b7' }}>Ghi chú:</span>
                <span className="learn-feedback-val" style={{ fontWeight: 500 }}>{note}</span>
              </div>
            )}

            {!isCorrect && !isSkipped && userAnswer && (
              <div className="learn-feedback-row learn-user-ans">
                <span className="learn-feedback-lbl">Bạn đã trả lời:</span>
                <span className="learn-feedback-val is-strikethrough">{userAnswer}</span>
              </div>
            )}

            <div className="learn-feedback-row learn-correct-ans">
              <span className="learn-feedback-lbl">
                {isCorrect ? 'Đáp án:' : 'Đáp án đúng:'}
              </span>
              <div className="learn-correct-ans-content">
                <span className="learn-feedback-val is-bold">{correctAnswer}</span>
                {card?.term && (
                  <button
                    type="button"
                    className="learn-audio-btn-inline"
                    onClick={handleSpeakTerm}
                    title="Nghe lại phát âm"
                    aria-label="Nghe phát âm tiếng Anh"
                  >
                    <Volume2 size={18} />
                  </button>
                )}
              </div>
            </div>

            {alsoCorrect && (
              <div className="learn-feedback-row learn-also-correct">
                <span className="learn-feedback-lbl">Cũng đúng:</span>
                <span className="learn-feedback-val">{alsoCorrect}</span>
              </div>
            )}

            {/* Reinforcement Details: IPA, partOfSpeech, example */}
            {(card?.pronunciation || card?.partOfSpeech || card?.example) && (
              <div className="learn-reinforcement-box">
                <div className="learn-reinforcement-meta">
                  {card.partOfSpeech && <span className="learn-pos-tag">{card.partOfSpeech}</span>}
                  {card.pronunciation && (
                    <span className="learn-ipa-text">/{card.pronunciation}/</span>
                  )}
                </div>
                {card.example && (
                  <div className="learn-example-text">
                    <em>"{card.example}"</em>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Read-only Input Display */}
        <div className="learn-readonly-input-box">
          <input
            type="text"
            className="learn-answer-input is-readonly"
            value={userAnswer || (isSkipped ? '(Không biết)' : '')}
            readOnly
            tabIndex={-1}
          />
        </div>

        {/* Action Controls */}
        <div className="learn-feedback-actions">
          <button
            type="button"
            className="learn-continue-btn"
            onClick={handleNext}
          >
            <span>Tiếp tục</span>
            <kbd className="learn-key-badge">↵</kbd>
            <ArrowRight size={18} />
          </button>

          {!isCorrect && (
            <button
              type="button"
              className="learn-override-link-btn"
              onClick={onOverride}
            >
              Tôi đã đúng (Chấp nhận đáp án này)
            </button>
          )}
        </div>
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
