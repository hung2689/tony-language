import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  Send,
  Volume2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Plus,
  Check,
  Compass,
  Key,
  BookOpen,
  Award,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { synonymChallengeService } from '../../services/synonymChallengeService';
import { isAnswerValid, isAnswerContextual, calculateEvaluationCounts } from '../synonym/synonymEvaluationUtils';
import { speakEnglishTerm } from '../../utils/speechUtils';
import { hasGeminiApiKey } from '../../utils/aiKeyStorage';
import GeminiKeyModal from '../../components/common/GeminiKeyModal';
import Ripple from '../../components/common/Ripple';
import './SynonymChallengeView.css';

export default function SynonymChallengeView({
  cards = [],
  deck = null,
  onToast,
  onBackToCard,
}) {
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingQueue, setLoadingQueue] = useState(true);

  // Chip input state
  const [inputValue, setInputValue] = useState('');
  const [answerChips, setAnswerChips] = useState([]);
  const [editingChipIndex, setEditingChipIndex] = useState(null);

  // Evaluation & Results state
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [addedCardsMap, setAddedCardsMap] = useState({}); // { wordLower: true }
  const [addingWord, setAddingWord] = useState(null);

  // Deck / Session Stats
  const [stats, setStats] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // BYOK Modal
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(() => hasGeminiApiKey());

  const inputRef = useRef(null);

  // Sync API Key status
  useEffect(() => {
    const handleKeyChange = () => {
      setHasCustomKey(hasGeminiApiKey());
    };
    window.addEventListener('gemini_api_key_changed', handleKeyChange);
    return () => {
      window.removeEventListener('gemini_api_key_changed', handleKeyChange);
    };
  }, []);

  // Fetch queue from backend
  const loadQueue = useCallback(async () => {
    if (!deck?.id) return;
    setLoadingQueue(true);
    try {
      const items = await synonymChallengeService.getChallenges(deck.id, 25);
      if (items && items.length > 0) {
        setQueue(items);
        setCurrentIndex(0);
        setIsCompleted(false);
      } else if (cards.length > 0) {
        // Fallback to local cards if backend queue is empty
        const mapped = cards.map((c) => ({
          id: c.id,
          term: c.term || c.word,
          meaning: c.meaning || c.definition,
          pronunciation: c.pronunciation,
          partOfSpeech: c.wordType || c.partOfSpeech,
          exampleSentence: c.exampleSentence || c.example,
          knownSynonymsCount: c.synonyms ? c.synonyms.length : 0,
        }));
        setQueue(mapped);
        setCurrentIndex(0);
        setIsCompleted(false);
      }
    } catch (err) {
      console.warn('Could not load prioritized queue, using deck cards:', err);
      if (cards.length > 0) {
        const mapped = cards.map((c) => ({
          id: c.id,
          term: c.term || c.word,
          meaning: c.meaning || c.definition,
          pronunciation: c.pronunciation,
          partOfSpeech: c.wordType || c.partOfSpeech,
          exampleSentence: c.exampleSentence || c.example,
          knownSynonymsCount: c.synonyms ? c.synonyms.length : 0,
        }));
        setQueue(mapped);
      }
    } finally {
      setLoadingQueue(false);
    }
  }, [deck?.id, cards]);

  // Load stats
  const loadStats = useCallback(async () => {
    if (!deck?.id) return;
    const res = await synonymChallengeService.getStats(deck.id);
    if (res) {
      setStats(res);
    }
  }, [deck?.id]);

  useEffect(() => {
    loadQueue();
    loadStats();
  }, [loadQueue, loadStats]);

  const currentItem = queue[currentIndex] || null;

  // Add words to chip list (handles comma, enter, paste)
  const addWords = useCallback((rawText) => {
    if (!rawText) return;
    const tokens = rawText
      .split(/[,;\n]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tokens.length === 0) return;

    setAnswerChips((prev) => {
      const lowerExisting = new Set(prev.map((w) => w.toLowerCase()));
      const next = [...prev];
      for (const token of tokens) {
        if (!lowerExisting.has(token.toLowerCase())) {
          lowerExisting.add(token.toLowerCase());
          next.push(token);
        }
      }
      return next;
    });
    setInputValue('');
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addWords(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && answerChips.length > 0) {
      // Remove last chip if input is empty
      setAnswerChips((prev) => prev.slice(0, -1));
    }
  };

  const handlePaste = (e) => {
    const pasteData = e.clipboardData.getData('text');
    if (pasteData && (pasteData.includes(',') || pasteData.includes('\n'))) {
      e.preventDefault();
      addWords(pasteData);
    }
  };

  const removeChip = (indexToRemove) => {
    setAnswerChips((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const startEditChip = (index) => {
    setEditingChipIndex(index);
    setInputValue(answerChips[index]);
    removeChip(index);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Submit and evaluate
  const handleSubmit = async () => {
    // If input still has unsaved text, add it first
    let finalChips = [...answerChips];
    if (inputValue.trim()) {
      const trimmed = inputValue.trim();
      if (!finalChips.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
        finalChips.push(trimmed);
        setAnswerChips(finalChips);
      }
      setInputValue('');
    }

    if (finalChips.length === 0) {
      if (onToast) onToast('Vui lòng nhập ít nhất một từ đồng nghĩa', 'error');
      return;
    }

    if (!currentItem) return;

    setEvaluating(true);
    setEvaluation(null);

    try {
      const payload = {
        deckId: deck?.id,
        vocabularyId: currentItem.id,
        rootWord: currentItem.term,
        userAnswers: finalChips,
      };

      const result = await synonymChallengeService.evaluateAnswers(
        deck.id,
        payload,
        hasCustomKey ? localStorage.getItem('user_gemini_api_key') : null
      );

      setEvaluation(result);
      loadStats(); // refresh stats
    } catch (err) {
      console.error('Evaluation failed:', err);
      if (onToast) onToast('Có lỗi khi đánh giá từ đồng nghĩa. Vui lòng thử lại.', 'error');
    } finally {
      setEvaluating(false);
    }
  };

  // Quick add card to deck
  const handleQuickAdd = async (missedWord) => {
    if (!deck?.id || addingWord) return;
    setAddingWord(missedWord.word);

    try {
      const res = await synonymChallengeService.quickAddCard(deck.id, {
        term: missedWord.word,
        meaning: missedWord.meaning || 'Từ đồng nghĩa',
        pronunciation: missedWord.ipa,
        partOfSpeech: missedWord.pos,
        exampleSentence: missedWord.example,
      });

      if (res?.status === 'DUPLICATE') {
        if (onToast) onToast(res.message, 'info');
      } else {
        if (onToast) onToast(`Đã thêm "${missedWord.word}" vào bộ từ!`, 'success');
      }

      setAddedCardsMap((prev) => ({
        ...prev,
        [missedWord.word.toLowerCase()]: true,
      }));
    } catch (err) {
      console.error('Failed to quick add card:', err);
      if (onToast) onToast('Không thể thêm từ vào bộ từ.', 'error');
    } finally {
      setAddingWord(null);
    }
  };

  // Move to next word
  const handleNextWord = () => {
    if (currentIndex + 1 < queue.length) {
      setCurrentIndex((prev) => prev + 1);
      setAnswerChips([]);
      setInputValue('');
      setEvaluation(null);
      setAddedCardsMap({});
    } else {
      setIsCompleted(true);
    }
  };

  // Retry current word
  const handleRetryCurrent = () => {
    setEvaluation(null);
    setAnswerChips([]);
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Restart whole deck challenge
  const handleRestartQueue = () => {
    setCurrentIndex(0);
    setAnswerChips([]);
    setInputValue('');
    setEvaluation(null);
    setIsCompleted(false);
    loadQueue();
  };

  if (loadingQueue) {
    return (
      <div className="vintage-synonym-container">
        <div className="vintage-synonym-parchment-box is-loading">
          <div className="vintage-compass-spinner">
            <Compass size={48} className="spinning-compass" />
          </div>
          <h2 className="vintage-loading-title">Đang chuẩn bị danh sách thử thách...</h2>
          <p className="vintage-loading-sub">Hệ thống đang ưu tiên các từ bạn cần ôn tập.</p>
        </div>
      </div>
    );
  }

  if (!currentItem && queue.length === 0) {
    return (
      <div className="vintage-synonym-container">
        <div className="vintage-synonym-parchment-box is-empty">
          <Layers size={48} className="vintage-empty-icon" />
          <h2 className="vintage-empty-title">Bộ từ này chưa có từ vựng</h2>
          <p className="vintage-empty-sub">Hãy thêm từ vựng vào bộ thẻ để bắt đầu thử thách tìm từ đồng nghĩa.</p>
          <button type="button" className="vintage-btn-primary" onClick={onBackToCard}>
            <ArrowLeft size={16} />
            <span>Quay lại bộ từ</span>
          </button>
        </div>
      </div>
    );
  }

  // Session Completed State
  if (isCompleted) {
    return (
      <div className="vintage-synonym-container">
        <div className="vintage-synonym-parchment-box is-complete">
          <div className="vintage-ribbon-trophy">
            <Award size={56} className="trophy-gold-icon" />
          </div>
          <h2 className="vintage-complete-title">Hoàn thành thử thách từ đồng nghĩa!</h2>
          <p className="vintage-complete-sub">
            Bạn đã vượt qua toàn bộ {queue.length} từ trong danh sách thử thách của bộ từ này.
          </p>

          {stats && (
            <div className="vintage-summary-grid">
              <div className="vintage-summary-card">
                <span className="summary-number">{stats.totalChallenges}</span>
                <span className="summary-label">Lượt thử thách</span>
              </div>
              <div className="vintage-summary-card">
                <span className="summary-number">{stats.totalSubmitted}</span>
                <span className="summary-label">Tổng từ đã đoán</span>
              </div>
              <div className="vintage-summary-card is-valid">
                <span className="summary-number">{stats.totalValid}</span>
                <span className="summary-label">Từ đúng</span>
              </div>
              <div className="vintage-summary-card">
                <span className="summary-number">{stats.accuracyRate}%</span>
                <span className="summary-label">Tỷ lệ chính xác</span>
              </div>
            </div>
          )}

          <div className="vintage-complete-actions">
            <button type="button" className="vintage-btn-secondary" onClick={handleRestartQueue}>
              <RotateCcw size={16} />
              <span>Luyện tập lại</span>
            </button>
            <button type="button" className="vintage-btn-primary" onClick={onBackToCard}>
              <ArrowLeft size={16} />
              <span>Quay lại bộ từ</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vintage-synonym-container">
      {/* Top Utility Header */}
      <div className="vintage-synonym-top-bar">
        <div className="top-bar-left">
          <button type="button" className="vintage-back-pill" onClick={onBackToCard}>
            <ArrowLeft size={15} />
            <span>Quay lại</span>
          </button>
          <div className="vintage-mode-indicator">
            <Sparkles size={15} className="sparkle-amber" />
            <span>Thách thức từ đồng nghĩa (AI)</span>
          </div>
        </div>

        <div className="top-bar-right">
          <span className="vintage-step-badge">
            Từ {currentIndex + 1} / {queue.length}
          </span>
          <button
            type="button"
            className={`vintage-byok-pill ${hasCustomKey ? 'is-active' : ''}`}
            onClick={() => setIsKeyModalOpen(true)}
            title="Cài đặt Google Gemini API Key"
          >
            <Key size={14} />
            <span>{hasCustomKey ? 'API Key: Đã bật' : 'Gemini Key'}</span>
          </button>
        </div>
      </div>

      {/* Main Learning Box */}
      <div className="vintage-synonym-parchment-box">
        {/* Corner Rivet Ornaments */}
        <div className="rivet rivet-tl" />
        <div className="rivet rivet-tr" />
        <div className="rivet rivet-bl" />
        <div className="rivet rivet-br" />

        {/* 1. HERO QUESTION DISPLAY */}
        <section className="vintage-question-hero">
          <div className="hero-word-wrap">
            <h1 className="hero-english-word">{currentItem.term}</h1>
            <button
              type="button"
              className="vintage-speaker-btn"
              onClick={() => speakEnglishTerm(currentItem.term)}
              title="Phát âm từ gốc"
              aria-label={`Phát âm ${currentItem.term}`}
            >
              <img src="/assets/flashcard/flashcard-sound.png" alt="Phát âm" />
            </button>
          </div>

          <div className="hero-meta-row">
            {currentItem.pronunciation && (
              <span className="hero-ipa">{currentItem.pronunciation}</span>
            )}
            {currentItem.partOfSpeech && (
              <span className="hero-pos-badge">{currentItem.partOfSpeech}</span>
            )}
          </div>

          {currentItem.meaning && (
            <p className="hero-vietnamese-meaning">{currentItem.meaning}</p>
          )}

          
        </section>

        {/* 2. CHIP INPUT AREA (Enabled before evaluation) */}
        {!evaluation && (
          <section className="vintage-chip-input-section">
            <div
              className={`vintage-chip-input-container ${evaluating ? 'is-disabled' : ''}`}
              onClick={() => inputRef.current && inputRef.current.focus()}
            >
              {answerChips.map((chip, idx) => (
                <span key={`${chip}-${idx}`} className="vintage-input-chip">
                  <span
                    className="chip-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditChip(idx);
                    }}
                    title="Nhấn để chỉnh sửa"
                  >
                    {chip}
                  </span>
                  <button
                    type="button"
                    className="chip-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeChip(idx);
                    }}
                    title="Xóa từ này"
                    aria-label={`Xóa ${chip}`}
                  >
                    ×
                  </button>
                </span>
              ))}

              <input
                ref={inputRef}
                type="text"
                className="vintage-chip-field"
                placeholder={
                  answerChips.length === 0
                    ? 'Nhập từ đồng nghĩa (ví dụ: rapid, swift...)'
                    : 'Nhập tiếp...'
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                disabled={evaluating}
                autoFocus
              />
            </div>

            <div className="vintage-input-actions-bar">
              <span className="chip-count-hint">
                Đã nhập <strong>{answerChips.length}</strong> từ
              </span>

              <button
                type="button"
                className="vintage-submit-challenge-btn"
                onClick={handleSubmit}
                disabled={evaluating || (answerChips.length === 0 && !inputValue.trim())}
              >
                {evaluating ? (
                  <>
                    <Compass size={18} className="spinning-compass" />
                    <span>AI đang phân tích...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Nộp đáp án (Submit)</span>
                  </>
                )}
                <Ripple />
              </button>
            </div>
          </section>
        )}

        {/* 3. EVALUATION RESULTS SCREEN */}
        {evaluation && (
          <section className="vintage-results-section">
            {/* Fallback Warning Banner if AI was down */}
            {evaluation.evaluationMode === 'LOCAL_FALLBACK' && (
              <div className="vintage-fallback-banner" role="alert">
                <AlertTriangle size={20} className="fallback-warning-icon" />
                <div className="fallback-warning-content">
                  <span className="fallback-warning-title">Chế độ đối chiếu nội bộ (Fallback)</span>
                  <p className="fallback-warning-desc">
                    {evaluation.warningMessage ||
                      'Gemini AI hiện không khả dụng. Hệ thống đang đối chiếu với kho từ đồng nghĩa có sẵn trong cơ sở dữ liệu.'}
                  </p>
                </div>
              </div>
            )}

            {/* A. YOUR ANSWERS */}
            {(() => {
              const evaluatedWords = evaluation.evaluatedWords || [];
              const counts = calculateEvaluationCounts(evaluatedWords);

              return (
                <div className="vintage-result-group">
                  <div className="group-header">
                    <h2 className="group-title">A. Câu trả lời của bạn ({counts.total})</h2>
                    <div className="group-score-pill">
                      <span className="score-valid">Hợp lệ: {counts.valid}</span>
                      <span className="score-sep">/</span>
                      <span className="score-invalid">Chưa đúng: {counts.invalid}</span>
                    </div>
                  </div>

                  <div className="vintage-answers-list">
                    {evaluatedWords.map((item, idx) => {
                      const valid = isAnswerValid(item);
                      const contextual = isAnswerContextual(item);

                      return (
                        <div
                          key={`${item.word}-${idx}`}
                          className={`vintage-answer-item ${valid ? (contextual ? 'is-valid is-contextual' : 'is-valid') : 'is-invalid'}`}
                        >
                          <div className="answer-item-header">
                            <div className="answer-term-group">
                              {valid ? (
                                contextual ? (
                                  <HelpCircle size={18} className="icon-contextual" />
                                ) : (
                                  <CheckCircle2 size={18} className="icon-valid" />
                                )
                              ) : (
                                <XCircle size={18} className="icon-invalid" />
                              )}
                              <span className={`answer-word ${!valid ? 'is-struck' : ''}`}>
                                {item.word}
                              </span>
                              {item.meaning && (
                                <span className="answer-meaning">({item.meaning})</span>
                              )}
                            </div>

                            <div className="answer-badge-group">
                              {contextual ? (
                                <span className="answer-status-pill status-contextual">Ngữ cảnh phù hợp</span>
                              ) : valid ? (
                                <span className="answer-status-pill status-exact">Đồng nghĩa chính xác</span>
                              ) : (
                                <span className="answer-status-pill status-invalid">Chưa chính xác</span>
                              )}

                              <span className={`answer-source-badge ${item.source === 'DATABASE' ? 'is-db' : item.source === 'FALLBACK' ? 'is-fallback' : 'is-ai'}`}>
                                {item.source === 'DATABASE' ? 'Cơ sở dữ liệu' : item.source === 'FALLBACK' ? 'Đối chiếu nội bộ' : 'AI thẩm định'}
                              </span>
                            </div>
                          </div>

                          {item.explanation && (
                            <p className="answer-explanation">{item.explanation}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* B. MISSED SYNONYMS */}
            {evaluation.missedSynonyms && evaluation.missedSynonyms.length > 0 && (
              <div className="vintage-result-group">
                <div className="group-header">
                  <h2 className="group-title">
                    B. Từ đồng nghĩa gợi ý thêm ({evaluation.missedSynonyms.length})
                  </h2>
                  <span className="group-sub-badge">Ưu tiên từ vựng TOEIC thông dụng</span>
                </div>

                <div className="vintage-missed-grid">
                  {evaluation.missedSynonyms.map((syn, idx) => {
                    const isAdded =
                      syn.isAlreadyInDeck || addedCardsMap[syn.word.toLowerCase()];
                    const isCurrentlyAdding = addingWord === syn.word;

                    return (
                      <div key={`${syn.word}-${idx}`} className="vintage-missed-card">
                        <div className="missed-card-top">
                          <div className="missed-card-word-row">
                            <span className="missed-word">{syn.word}</span>
                            <button
                                type="button"
                                className="vintage-speaker-mini-btn"
                                onClick={() => speakEnglishTerm(syn.word)}
                                title="Phát âm"
                                aria-label={`Phát âm ${syn.word}`}
                              >
                                <img src="/assets/flashcard/flashcard-sound.png" alt="Phát âm" />
                              </button>
                            {syn.pos && <span className="missed-pos">{syn.pos}</span>}
                          </div>

                          <button
                            type="button"
                            className={`vintage-quick-add-btn ${isAdded ? 'is-added' : ''}`}
                            onClick={() => !isAdded && handleQuickAdd(syn)}
                            disabled={isAdded || isCurrentlyAdding}
                            title={isAdded ? 'Đã có trong bộ từ này' : 'Lưu vào bộ từ hiện tại'}
                          >
                            {isAdded ? (
                              <>
                                <Check size={13} />
                                <span>Đã lưu</span>
                              </>
                            ) : (
                              <>
                                <Plus size={13} />
                                <span>{isCurrentlyAdding ? 'Đang lưu...' : 'Lưu vào bộ'}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {syn.ipa && <div className="missed-ipa">{syn.ipa}</div>}

                        {syn.meaning && (
                          <div className="missed-meaning">{syn.meaning}</div>
                        )}

                        {syn.example && (
                          <div className="missed-example-box">
                            <div className="example-en">"{syn.example}"</div>
                            {syn.exampleVi && (
                              <div className="example-vi">{syn.exampleVi}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* C. SUMMARY METRICS */}
            <div className="vintage-result-group">
              <div className="group-header">
                <h2 className="group-title">C. Tổng kết thử thách</h2>
              </div>

              <div className="vintage-summary-grid">
                <div className="vintage-summary-card">
                  <span className="summary-number">{evaluation.totalSubmitted}</span>
                  <span className="summary-label">Tổng số đáp án</span>
                </div>
                <div className="vintage-summary-card is-valid">
                  <span className="summary-number">{evaluation.validCount}</span>
                  <span className="summary-label">Đáp án hợp lệ</span>
                </div>
                <div className="vintage-summary-card is-invalid">
                  <span className="summary-number">{evaluation.invalidCount}</span>
                  <span className="summary-label">Chưa phù hợp</span>
                </div>
                <div className="vintage-summary-card is-highlight">
                  <span className="summary-number">+{evaluation.newDiscoveredCount}</span>
                  <span className="summary-label">Từ mới khám phá</span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="vintage-results-actions">
              <button
                type="button"
                className="vintage-btn-secondary"
                onClick={handleRetryCurrent}
              >
                <RotateCcw size={16} />
                <span>Thử lại từ này</span>
              </button>

              <button
                type="button"
                className="vintage-btn-primary"
                onClick={handleNextWord}
              >
                <span>Từ tiếp theo</span>
                <ArrowRight size={16} />
                <Ripple />
              </button>
            </div>
          </section>
        )}
      </div>

      {/* GEMINI KEY MODAL */}
      <GeminiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeySaved={() => {
          setHasCustomKey(true);
          if (onToast) onToast('Đã lưu Gemini API Key thành công!', 'success');
        }}
      />
    </div>
  );
}
