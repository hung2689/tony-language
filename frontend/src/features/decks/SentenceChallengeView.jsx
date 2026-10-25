import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  Send,
  Volume2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCw,
  ArrowRight,
  ArrowLeft,
  Trophy,
  BookOpen,
  Award,
  Check,
  X,
  RefreshCw,
  Key,
} from 'lucide-react';
import { sentenceChallengeService } from '../../services/sentenceChallengeService';
import { speakEnglishTerm } from '../../utils/speechUtils';
import { hasGeminiApiKey } from '../../utils/aiKeyStorage';
import GeminiKeyModal from '../../components/common/GeminiKeyModal';
import './SentenceChallenge.css';

export default function SentenceChallengeView({
  cards = [],
  deck = null,
  onToast,
  onBackToCard,
}) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userSentence, setUserSentence] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [history, setHistory] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(() => hasGeminiApiKey());

  const textareaRef = useRef(null);

  // Sync API key status
  useEffect(() => {
    const handleKeyChange = () => {
      setHasCustomKey(hasGeminiApiKey());
    };
    window.addEventListener('gemini_api_key_changed', handleKeyChange);
    return () => {
      window.removeEventListener('gemini_api_key_changed', handleKeyChange);
    };
  }, []);

  // Load sentence challenges
  const loadChallenges = useCallback(
    async (forceGenerate = false) => {
      if (!cards || cards.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setCurrentIndex(0);
      setUserSentence('');
      setEvaluation(null);
      setHistory([]);
      setIsCompleted(false);
      setShowHint(false);

      try {
        let items = [];
        if (forceGenerate) {
          items = await sentenceChallengeService.generateNewChallenges(
            deck?.id,
            cards,
            deck?.name
          );
        } else {
          items = await sentenceChallengeService.getChallenges(
            deck?.id,
            cards,
            deck?.name
          );
        }
        setChallenges(items || []);
      } catch (err) {
        onToast?.(err.message || 'Không thể tạo thử thách đặt câu', 'error');
      } finally {
        setLoading(false);
      }
    },
    [cards, deck, onToast]
  );

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  // Focus textarea when moving to next challenge
  useEffect(() => {
    if (!loading && !isCompleted && !evaluation) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [currentIndex, loading, isCompleted, evaluation]);

  const currentChallenge = challenges[currentIndex];

  // Evaluate user submission
  const handleEvaluate = async () => {
    if (!currentChallenge || !userSentence.trim() || evaluating) return;

    setEvaluating(true);
    try {
      const payload = {
        cardId: currentChallenge.cardId,
        targetWord: currentChallenge.targetWord,
        promptVi: currentChallenge.promptVi,
        userSentence: userSentence.trim(),
        referenceSentence: currentChallenge.referenceEn,
      };

      const result = await sentenceChallengeService.evaluateSentence(
        deck?.id,
        payload
      );
      setEvaluation(result);

      // Play sound or give celebratory feedback
      if (result.score >= 80) {
        onToast?.(`Xuất sắc! Đạt ${result.score}/100 điểm ✨`, 'success');
      }
    } catch (err) {
      onToast?.(err.message || 'Lỗi khi chấm điểm câu', 'error');
    } finally {
      setEvaluating(false);
    }
  };

  // Keyboard shortcut Ctrl+Enter to submit
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!evaluation && userSentence.trim() && !evaluating) {
        handleEvaluate();
      } else if (evaluation) {
        handleNext();
      }
    }
  };

  // Move to next challenge
  const handleNext = () => {
    if (!currentChallenge || !evaluation) return;

    // Save history
    const record = {
      challenge: currentChallenge,
      userSentence: userSentence.trim(),
      evaluation: evaluation,
    };
    const nextHistory = [...history, record];
    setHistory(nextHistory);

    if (currentIndex + 1 < challenges.length) {
      setCurrentIndex((prev) => prev + 1);
      setUserSentence('');
      setEvaluation(null);
      setShowHint(false);
    } else {
      setIsCompleted(true);
    }
  };

  // Pronunciation handler
  const handlePronounce = (text) => {
    speakEnglishTerm(text, (msg) => onToast?.(msg, 'error'));
  };

  // Render Loading State
  if (loading) {
    return (
      <div className="sentence-challenge-state-box">
        <RefreshCw size={36} className="sentence-challenge-spinner" />
        <h3 className="sentence-challenge-state-title">
          AI đang tạo thử thách đặt câu...
        </h3>
        <p className="sentence-challenge-state-desc">
          Hệ thống đang phân tích các từ vựng trong bộ thẻ để thiết kế bài tập dịch và đặt câu phù hợp.
        </p>
      </div>
    );
  }

  // Render Empty State if no challenges available
  if (!challenges || challenges.length === 0) {
    return (
      <div className="sentence-challenge-state-box">
        <AlertCircle size={36} className="sentence-challenge-icon-warning" />
        <h3 className="sentence-challenge-state-title">Chưa có bài tập đặt câu</h3>
        <p className="sentence-challenge-state-desc">
          Bộ từ vựng cần có ít nhất một thẻ từ vựng để tạo bài luyện đặt câu.
        </p>
        <button
          type="button"
          className="monochrome-btn-primary"
          onClick={onBackToCard}
        >
          Quay về Thẻ từ
        </button>
      </div>
    );
  }

  // Render Completed Summary View
  if (isCompleted) {
    const totalScore = history.reduce((sum, h) => sum + (h.evaluation?.score || 0), 0);
    const avgScore = history.length > 0 ? Math.round(totalScore / history.length) : 0;
    const passedCount = history.filter((h) => (h.evaluation?.score || 0) >= 70).length;

    return (
      <div className="sentence-challenge-container sentence-summary-fade-in">
        <div className="sentence-summary-hero">
          <div className="sentence-summary-trophy-wrap">
            <Trophy size={42} className="sentence-trophy-icon" />
          </div>
          <h2 className="sentence-summary-title">Hoàn thành thử thách đặt câu!</h2>
          <p className="sentence-summary-subtitle">
            Bạn đã xuất sắc hoàn thành {history.length} câu luyện viết & dịch từ vựng.
          </p>

          <div className="sentence-summary-stats-grid">
            <div className="sentence-stat-card">
              <span className="sentence-stat-label">Điểm trung bình AI</span>
              <span className="sentence-stat-val accent-score">{avgScore}/100</span>
            </div>
            <div className="sentence-stat-card">
              <span className="sentence-stat-label">Câu đạt chuẩn (≥ 70)</span>
              <span className="sentence-stat-val">
                {passedCount} / {history.length}
              </span>
            </div>
            <div className="sentence-stat-card">
              <span className="sentence-stat-label">Độ chính xác từ vựng</span>
              <span className="sentence-stat-val">
                {Math.round(
                  (history.filter((h) => h.evaluation?.targetWordUsed).length /
                    (history.length || 1)) *
                    100
                )}
                %
              </span>
            </div>
          </div>

          <div className="sentence-summary-actions">
            <button
              type="button"
              className="sentence-btn-secondary"
              onClick={onBackToCard}
            >
              <ArrowLeft size={16} />
              Quay lại Thẻ từ
            </button>
            <button
              type="button"
              className="sentence-btn-primary"
              onClick={() => loadChallenges(true)}
            >
              <RotateCw size={16} />
              Tạo bộ câu mới (AI)
            </button>
          </div>
        </div>

        {/* Detailed Review List */}
        <div className="sentence-review-section">
          <h3 className="sentence-review-title">
            <Award size={18} /> Chi tiết từng câu luyện tập
          </h3>
          <div className="sentence-review-list">
            {history.map((item, idx) => (
              <div key={idx} className="sentence-review-item">
                <div className="sentence-review-top">
                  <div className="sentence-review-badge">
                    Câu {idx + 1}: <strong>{item.challenge.targetWord}</strong>
                  </div>
                  <span
                    className={`sentence-review-score ${
                      item.evaluation.score >= 80
                        ? 'is-high'
                        : item.evaluation.score >= 50
                        ? 'is-medium'
                        : 'is-low'
                    }`}
                  >
                    {item.evaluation.score} điểm
                  </span>
                </div>

                <div className="sentence-review-prompt">
                  <em>Gợi ý tiếng Việt:</em> {item.challenge.promptVi}
                </div>

                <div className="sentence-review-answer-grid">
                  <div className="sentence-review-col">
                    <span className="sentence-col-label">Câu bạn viết:</span>
                    <p className="sentence-col-text">{item.userSentence}</p>
                  </div>
                  <div className="sentence-review-col">
                    <span className="sentence-col-label">
                      Câu bản xứ gợi ý:
                      <button
                        type="button"
                        className="sentence-audio-btn-small"
                        onClick={() =>
                          handlePronounce(
                            item.evaluation.nativeAlternative ||
                              item.challenge.referenceEn
                          )
                        }
                        title="Nghe phát âm"
                      >
                        <Volume2 size={14} />
                      </button>
                    </span>
                    <p className="sentence-col-text is-native">
                      {item.evaluation.nativeAlternative ||
                        item.challenge.referenceEn}
                    </p>
                  </div>
                </div>

                {item.evaluation.feedback && (
                  <p className="sentence-review-feedback">
                    💬 {item.evaluation.feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Active Challenge Question View
  return (
    <div className="sentence-challenge-container">
      {/* Header bar: Progress and Actions */}
      <div className="sentence-header-bar">
        <div className="sentence-header-left">
          <button
            type="button"
            className="sentence-back-btn"
            onClick={onBackToCard}
            title="Quay lại flashcard"
          >
            <ArrowLeft size={16} />
            <span>Thẻ từ</span>
          </button>
          <div className="sentence-mode-pill">
            <Sparkles size={14} className="sentence-sparkle-icon" />
            <span>AI Đặt câu & Chấm điểm</span>
          </div>
        </div>

        <div className="sentence-header-right">
          <button
            type="button"
            className={`sentence-gemini-badge ${hasCustomKey ? 'is-active' : 'is-missing'}`}
            onClick={() => setIsKeyModalOpen(true)}
            title="Cấu hình Google Gemini AI Key cá nhân"
          >
            <Key size={13} />
            <span>{hasCustomKey ? 'Gemini AI' : 'Nạp AI Key'}</span>
            <span className={`sentence-key-dot ${hasCustomKey ? 'is-green' : 'is-amber'}`} />
          </button>

          <span className="sentence-progress-text">
            Câu <strong>{currentIndex + 1}</strong> / {challenges.length}
          </span>
          <button
            type="button"
            className="sentence-action-icon-btn"
            onClick={() => loadChallenges(true)}
            title="Tạo lại bộ câu khác"
          >
            <RotateCw size={15} />
          </button>
        </div>
      </div>

      {/* BYOK Hint Banner if not configured */}
      {!hasCustomKey && (
        <div className="sentence-byok-banner">
          <div className="sentence-byok-left">
            <Sparkles size={16} className="sentence-byok-sparkle" />
            <span>
              <strong>Kích hoạt Gemini AI cá nhân:</strong> Tự động đặt câu phong phú theo ngữ cảnh và chấm điểm như người bản xứ.
            </span>
          </div>
          <button
            type="button"
            className="sentence-byok-btn"
            onClick={() => setIsKeyModalOpen(true)}
          >
            <Key size={13} />
            <span>Nạp API Key miễn phí</span>
          </button>
        </div>
      )}

      {/* Progress Line */}
      <div className="sentence-progress-track">
        <div
          className="sentence-progress-bar"
          style={{
            width: `${((currentIndex + 1) / challenges.length) * 100}%`,
          }}
        />
      </div>

      {/* Main Challenge Card */}
      <div className="sentence-main-card">
        {/* Target Word Info Header */}
        <div className="sentence-word-header">
          <div className="sentence-target-word-pill">
            <span className="sentence-pill-label">Từ vựng mục tiêu:</span>
            <span className="sentence-pill-word">
              {currentChallenge.targetWord}
            </span>
            {currentChallenge.partOfSpeech && (
              <span className="sentence-pill-pos">
                ({currentChallenge.partOfSpeech})
              </span>
            )}
            <button
              type="button"
              className="sentence-audio-btn"
              onClick={() => handlePronounce(currentChallenge.targetWord)}
              title="Phát âm từ vựng"
            >
              <Volume2 size={16} />
            </button>
          </div>

          {currentChallenge.meaning && (
            <span className="sentence-meaning-text">
              Nghĩa: <em>{currentChallenge.meaning}</em>
            </span>
          )}
        </div>

        {/* Vietnamese Prompt Box */}
        <div className="sentence-prompt-box">
          <div className="sentence-prompt-header">
            <BookOpen size={16} className="sentence-prompt-icon" />
            <span className="sentence-prompt-title">Đề bài tiếng Việt</span>
          </div>
          <p className="sentence-prompt-content">
            {currentChallenge.promptVi}
          </p>

          {currentChallenge.hint && (
            <div className="sentence-hint-row">
              <button
                type="button"
                className="sentence-hint-toggle"
                onClick={() => setShowHint(!showHint)}
              >
                <HelpCircle size={14} />
                <span>{showHint ? 'Ẩn gợi ý' : 'Xem gợi ý'}</span>
              </button>
              {showHint && (
                <span className="sentence-hint-text">
                  {currentChallenge.hint}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Translation Input Area */}
        <div className="sentence-input-area">
          <label htmlFor="sentence-input" className="sentence-input-label">
            Dịch câu sang tiếng Anh (bắt buộc sử dụng từ "<strong>{currentChallenge.targetWord}</strong>"):
          </label>
          <textarea
            id="sentence-input"
            ref={textareaRef}
            rows={3}
            className={`sentence-textarea ${evaluation ? 'is-evaluated' : ''}`}
            placeholder={`Nhập câu tiếng Anh của bạn tại đây... (Nhấn Ctrl + Enter để AI chấm điểm)`}
            value={userSentence}
            onChange={(e) => setUserSentence(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={evaluating || Boolean(evaluation)}
          />

          <div className="sentence-input-footer">
            <span className="sentence-hint-shortcut">
              Mẹo: Nhấn <strong>Ctrl + Enter</strong> để nộp bài
            </span>

            {!evaluation ? (
              <button
                type="button"
                className="sentence-submit-btn"
                onClick={handleEvaluate}
                disabled={!userSentence.trim() || evaluating}
              >
                {evaluating ? (
                  <>
                    <RefreshCw size={16} className="sentence-spin-icon" />
                    <span>AI đang phân tích...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Chấm điểm với AI</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>

        {/* AI Evaluation Box (Displayed after submission) */}
        {evaluation && (
          <div className="sentence-feedback-card">
            <div className="sentence-feedback-header">
              <div className="sentence-feedback-score-wrap">
                <span
                  className={`sentence-score-badge ${
                    evaluation.score >= 80
                      ? 'is-success'
                      : evaluation.score >= 50
                      ? 'is-warning'
                      : 'is-error'
                  }`}
                >
                  {evaluation.score} / 100 điểm
                </span>
                <span className="sentence-score-status">
                  {evaluation.score >= 80
                    ? '🌟 Xuất sắc!'
                    : evaluation.score >= 50
                    ? '💡 Khá tốt, cần tối ưu!'
                    : '✍️ Cần luyện tập thêm!'}
                </span>
              </div>

              <div
                className={`sentence-target-status ${
                  evaluation.targetWordUsed ? 'is-valid' : 'is-invalid'
                }`}
              >
                {evaluation.targetWordUsed ? (
                  <>
                    <Check size={16} />
                    <span>Đã dùng đúng từ "{currentChallenge.targetWord}"</span>
                  </>
                ) : (
                  <>
                    <X size={16} />
                    <span>Chưa chứa từ khóa "{currentChallenge.targetWord}"</span>
                  </>
                )}
              </div>
            </div>

            {/* AI Review Text */}
            <p className="sentence-ai-comment">{evaluation.feedback}</p>

            {/* Grammar / Syntax Tips */}
            {evaluation.grammarNotes && evaluation.grammarNotes.length > 0 && (
              <div className="sentence-notes-box">
                <span className="sentence-notes-title">Lưu ý ngữ pháp:</span>
                <ul>
                  {evaluation.grammarNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Native Suggestion */}
            {evaluation.nativeAlternative && (
              <div className="sentence-native-card">
                <div className="sentence-native-header">
                  <span className="sentence-native-title">
                    Gợi ý cách viết tự nhiên của người bản xứ:
                  </span>
                  <button
                    type="button"
                    className="sentence-audio-btn-medium"
                    onClick={() => handlePronounce(evaluation.nativeAlternative)}
                    title="Nghe cách phát âm tự nhiên"
                  >
                    <Volume2 size={16} />
                    <span>Nghe</span>
                  </button>
                </div>
                <p className="sentence-native-text">
                  "{evaluation.nativeAlternative}"
                </p>
              </div>
            )}

            {/* Next Button */}
            <div className="sentence-next-row">
              <button
                type="button"
                className="sentence-next-btn"
                onClick={handleNext}
              >
                <span>
                  {currentIndex + 1 < challenges.length
                    ? 'Câu tiếp theo'
                    : 'Xem kết quả tổng kết'}
                </span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Personal Gemini AI Key Modal */}
      <GeminiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onSuccess={() => loadChallenges(true)}
        onToast={onToast}
      />
    </div>
  );
}
