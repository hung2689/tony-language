import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Settings,
  FolderX,
} from 'lucide-react';
import { deckService } from '../../services/deckService';
import { synonymChallengeService } from '../../services/synonymChallengeService';
import { isAnswerValid, isAnswerContextual, calculateEvaluationCounts } from './synonymEvaluationUtils';
import { speakEnglishTerm } from '../../utils/speechUtils';
import { hasGeminiApiKey } from '../../utils/aiKeyStorage';
import GeminiKeyModal from '../../components/common/GeminiKeyModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Toast from '../../components/common/Toast';
import Ripple from '../../components/common/Ripple';
import '../learn/Learn.css';
import './SynonymPage.css';

export default function SynonymPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();

  // Deck & Queue State
  const [deck, setDeck] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Session configuration: default 10 cards per round
  const [sessionBatchSize, setSessionBatchSize] = useState(() => {
    const saved = localStorage.getItem('synonym_challenge_batch_size');
    return saved ? parseInt(saved, 10) : 10;
  });

  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedInSession, setCompletedInSession] = useState(0);

  // Input State
  const [inputValue, setInputValue] = useState('');
  const [answerChips, setAnswerChips] = useState([]);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  // Quick Add state
  const [addedCardsMap, setAddedCardsMap] = useState({});
  const [addingWord, setAddingWord] = useState(null);

  // Cumulative Session Stats
  const [sessionStats, setSessionStats] = useState({
    totalSubmitted: 0,
    totalValid: 0,
    totalInvalid: 0,
    newDiscovered: 0,
    savedToDeck: 0,
  });

  // Completion & Modals
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(() => hasGeminiApiKey());
  const [toast, setToast] = useState(null);

  const inputRef = useRef(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3200);
  }, []);

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

  // Fetch Deck & Prioritized Queue
  const initSession = useCallback(async (batchSize) => {
    if (!deckId) return;
    setLoading(true);
    setErrorStatus(null);
    try {
      const deckData = await deckService.getDeck(deckId);
      setDeck(deckData);
      const rawCards = deckData?.cards || deckData?.vocabularies || [];
      setAllCards(rawCards);

      if (rawCards.length === 0) {
        setQueue([]);
        setLoading(false);
        return;
      }

      const limit = batchSize === 'all' ? rawCards.length : batchSize;
      const challengeItems = await synonymChallengeService.getChallenges(deckId, limit);

      if (challengeItems && challengeItems.length > 0) {
        setQueue(challengeItems);
      } else {
        // Fallback to deck cards
        setQueue(
          rawCards.slice(0, limit).map((c) => ({
            id: c.id,
            term: c.term || c.word,
            meaning: c.meaning || c.definition,
            pronunciation: c.pronunciation,
            partOfSpeech: c.wordType || c.partOfSpeech,
            exampleSentence: c.exampleSentence || c.example,
            knownSynonymsCount: c.synonyms ? c.synonyms.length : 0,
          }))
        );
      }

      setCurrentIndex(0);
      setCompletedInSession(0);
      setAnswerChips([]);
      setInputValue('');
      setEvaluation(null);
      setIsCompleted(false);
    } catch (err) {
      console.error('Failed to init synonym session:', err);
      if (err.status === 404 || err.message?.includes('404')) {
        setErrorStatus(404);
      } else {
        setErrorStatus(500);
      }
      setErrorMessage(err.message || 'Không thể tải bộ từ vựng.');
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    initSession(sessionBatchSize);
  }, [initSession, sessionBatchSize]);

  const currentItem = queue[currentIndex] || null;

  // Nautical Progress Calculation
  const totalInSession = queue.length;
  const progressPercent = useMemo(() => {
    if (totalInSession === 0) return 0;
    return Math.min(100, Math.round((completedInSession / totalInSession) * 100));
  }, [completedInSession, totalInSession]);

  // Chip input management: supports comma, Enter, paste
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
    setInputValue(answerChips[index]);
    removeChip(index);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Submit and evaluate
  const handleSubmit = async () => {
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
      showToast('Vui lòng nhập ít nhất một từ đồng nghĩa', 'error');
      return;
    }

    if (!currentItem) return;

    setEvaluating(true);
    setEvaluation(null);

    try {
      const payload = {
        deckId: Number(deckId),
        vocabularyId: currentItem.id,
        rootWord: currentItem.term,
        userAnswers: finalChips,
      };

      const result = await synonymChallengeService.evaluateAnswers(
        deckId,
        payload,
        hasCustomKey ? localStorage.getItem('user_gemini_api_key') : null
      );

      setEvaluation(result);

      const evaluatedList = result?.evaluatedWords || [];
      const counts = calculateEvaluationCounts(evaluatedList);

      // Accumulate session metrics strictly from unified evaluation counts
      setSessionStats((prev) => ({
        ...prev,
        totalSubmitted: prev.totalSubmitted + counts.total,
        totalValid: prev.totalValid + counts.valid,
        totalInvalid: prev.totalInvalid + counts.invalid,
        newDiscovered: prev.newDiscovered + (result.newDiscoveredCount || 0),
      }));
    } catch (err) {
      console.error('Evaluation error:', err);
      showToast('Có lỗi khi đánh giá. Vui lòng thử lại.', 'error');
    } finally {
      setEvaluating(false);
    }
  };

  // Quick Add Missed Synonym to Current Deck
  const handleQuickAdd = async (missedWord) => {
    if (!deckId || addingWord) return;
    setAddingWord(missedWord.word);

    try {
      const res = await synonymChallengeService.quickAddCard(deckId, {
        term: missedWord.word,
        meaning: missedWord.meaning || 'Từ đồng nghĩa',
        pronunciation: missedWord.ipa,
        partOfSpeech: missedWord.pos,
        exampleSentence: missedWord.example,
      });

      if (res?.status === 'DUPLICATE') {
        showToast(res.message, 'info');
      } else {
        showToast(`Đã thêm "${missedWord.word}" vào bộ từ!`, 'success');
        setSessionStats((prev) => ({ ...prev, savedToDeck: prev.savedToDeck + 1 }));
      }

      setAddedCardsMap((prev) => ({
        ...prev,
        [missedWord.word.toLowerCase()]: true,
      }));
    } catch (err) {
      console.error('Failed to quick add card:', err);
      showToast('Không thể lưu từ vào bộ từ.', 'error');
    } finally {
      setAddingWord(null);
    }
  };

  // Advance to Next Word or Finish Session
  const handleNextWord = () => {
    const nextCompleted = completedInSession + 1;
    setCompletedInSession(nextCompleted);

    if (nextCompleted >= queue.length) {
      // Voyage reaches Treasure island -> Session Completed!
      setIsCompleted(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setAnswerChips([]);
      setInputValue('');
      setEvaluation(null);
      setAddedCardsMap({});
    }
  };

  // Retry Current Word
  const handleRetryCurrent = () => {
    setEvaluation(null);
    setAnswerChips([]);
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Restart Current Batch
  const handleRestartBatch = () => {
    setCurrentIndex(0);
    setCompletedInSession(0);
    setAnswerChips([]);
    setInputValue('');
    setEvaluation(null);
    setIsCompleted(false);
    setAddedCardsMap({});
  };

  // Start Next Round (New Batch)
  const handleNextBatch = () => {
    initSession(sessionBatchSize);
  };

  // Exit Request
  const handleExitRequest = () => {
    if (completedInSession > 0 && !isCompleted) {
      setIsExitConfirmOpen(true);
    } else {
      navigate(`/decks/${deckId}`);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="learn-distraction-free-container vintage-learn-shell synonym-dedicated-shell">
        <div className="vintage-learn-parchment-box">
          <Ripple size={56} color="#A8783E" style={{ margin: '0 auto 16px auto' }} />
          <h2 className="vintage-state-title">Đang chuẩn bị Hải trình Từ đồng nghĩa...</h2>
          <p className="vintage-state-msg">Đang chọn lọc các từ cần ôn tập và nạp kho dữ liệu AI.</p>
        </div>
      </div>
    );
  }

  // 2. 404 / Error State
  if (errorStatus === 404 || !deck) {
    return (
      <div className="learn-distraction-free-container vintage-learn-shell synonym-dedicated-shell">
        <div className="vintage-learn-parchment-box">
          <FolderX size={56} style={{ color: '#796246' }} />
          <h2 className="vintage-state-title">Không tìm thấy Bộ từ vựng</h2>
          <p className="vintage-state-msg">
            {errorMessage || 'Bộ từ này không tồn tại hoặc bạn không có quyền truy cập.'}
          </p>
          <button type="button" className="vintage-outline-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
            <span>Về trang chủ</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Empty Deck State
  if (queue.length === 0) {
    return (
      <div className="learn-distraction-free-container vintage-learn-shell synonym-dedicated-shell">
        <div className="vintage-learn-parchment-box">
          <Layers size={56} style={{ color: '#796246' }} />
          <h2 className="vintage-state-title">Bộ từ chưa có thẻ nào</h2>
          <p className="vintage-state-msg">
            Hãy thêm từ vựng vào bộ thẻ để bắt đầu thử thách tìm từ đồng nghĩa.
          </p>
          <button
            type="button"
            className="vintage-outline-btn"
            onClick={() => navigate(`/decks/${deckId}`)}
          >
            <ArrowLeft size={16} />
            <span>Quay lại bộ từ</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Session Completed State (Thuyền đến Kho Báu)
  if (isCompleted) {
    const accuracy =
      sessionStats.totalSubmitted > 0
        ? Math.round((sessionStats.totalValid / sessionStats.totalSubmitted) * 100)
        : 0;

    return (
      <div className="learn-distraction-free-container vintage-learn-shell synonym-dedicated-shell">
        <div className="vintage-learn-container synonym-dedicated-container">
          {/* Top Header */}
          <header className="vintage-deck-header-row learn-vintage-header synonym-compact-header">
            <button
              type="button"
              className="vintage-header-back-btn"
              onClick={() => navigate(`/decks/${deckId}`)}
              title="Quay lại bộ từ"
            >
              <img src="/assets/flashcard/button-back.png" alt="Quay lại" />
            </button>

            <div className="vintage-header-title-ribbon">
              <span className="vintage-title-flourish">
                <span className="flourish-line" />
                <span className="flourish-diamond">◆</span>
              </span>
              <div className="vintage-ribbon-content">
                <BookOpen size={20} className="vintage-title-book-icon" />
                <h1 className="vintage-ribbon-text">{deck.name}</h1>
              </div>
              <span className="vintage-title-flourish is-right">
                <span className="flourish-diamond">◆</span>
                <span className="flourish-line" />
              </span>
            </div>

            <div style={{ width: '44px' }} />
          </header>

          {/* Voyage Bar Completed at 100% */}
          <div className="vintage-voyage-progress-container synonym-compact-voyage" role="progressbar">
            <div className="vintage-voyage-track">
              <div className="voyage-landmark start-harbor">
                <span className="landmark-icon">⚓</span>
                <span className="landmark-label">Bến Cảng</span>
              </div>
              <div className="voyage-sea-line">
                <div className="voyage-sea-progress" style={{ width: '100%' }} />
                <div className="voyage-ship-marker" style={{ left: '100%' }}>
                  <img
                    src="/assets/flashcard/flashcard-ship.png"
                    alt="Thuyền thám hiểm"
                    className="voyage-ship-img"
                  />
                </div>
              </div>
              <div className="voyage-landmark end-island">
                <span className="landmark-icon">🏝</span>
                <span className="landmark-label">Kho Báu</span>
              </div>
            </div>
            <div className="voyage-progress-counter">
              <span>Hải trình hoàn tất: <strong>{totalInSession}</strong> / {totalInSession} từ (100%)</span>
            </div>
          </div>

          {/* Main Results Scroll */}
          <main className="synonym-parchment-frame">
            <div className="parchment-rivet rivet-tl" />
            <div className="parchment-rivet rivet-tr" />
            <div className="parchment-rivet rivet-bl" />
            <div className="parchment-rivet rivet-br" />

            <div className="vintage-complete-banner-box">
              <div className="vintage-complete-trophy-wrap">
                <Award size={64} className="trophy-gold-svg" />
              </div>
              <h2 className="vintage-complete-heading">Hoàn thành phiên thử thách!</h2>
              <p className="vintage-complete-lead">
                Thuyền thám hiểm đã cập bến Kho Báu an toàn sau khi vượt qua <strong>{totalInSession}</strong> từ khảo nghiệm.
              </p>

              {/* Summary 4 Metrics Grid */}
              <div className="vintage-summary-grid">
                <div className="vintage-summary-card">
                  <span className="summary-number">{totalInSession}</span>
                  <span className="summary-label">Từ khảo nghiệm</span>
                </div>
                <div className="vintage-summary-card is-valid">
                  <span className="summary-number">{sessionStats.totalValid}</span>
                  <span className="summary-label">Đáp án hợp lệ</span>
                </div>
                <div className="vintage-summary-card is-highlight">
                  <span className="summary-number">+{sessionStats.savedToDeck}</span>
                  <span className="summary-label">Từ TOEIC đã lưu</span>
                </div>
                <div className="vintage-summary-card">
                  <span className="summary-number">{accuracy}%</span>
                  <span className="summary-label">Tỷ lệ chính xác</span>
                </div>
              </div>

              {/* Complete Actions */}
              <div className="vintage-complete-cta-row">
                <button
                  type="button"
                  className="vintage-launch-voyage-btn"
                  onClick={handleNextBatch}
                >
                  <Sparkles size={18} />
                  <span>Vòng tiếp theo ({sessionBatchSize} từ)</span>
                </button>
                <button
                  type="button"
                  className="vintage-outline-btn"
                  onClick={handleRestartBatch}
                >
                  <RotateCcw size={16} />
                  <span>Luyện tập lại vòng này</span>
                </button>
                <button
                  type="button"
                  className="vintage-outline-btn"
                  onClick={() => navigate(`/decks/${deckId}`)}
                >
                  <ArrowLeft size={16} />
                  <span>Về trang bộ từ</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // 5. Active Session: Question / Evaluation View
  return (
    <div className="learn-distraction-free-container vintage-learn-shell synonym-dedicated-shell">
      <div className="vintage-learn-container synonym-dedicated-container">
        {/* A. TOP HEADER ROW */}
        <header className="vintage-deck-header-row learn-vintage-header synonym-compact-header">
          <button
            type="button"
            className="vintage-header-back-btn"
            onClick={handleExitRequest}
            title="Quay lại bộ từ"
          >
            <img src="/assets/flashcard/button-back.png" alt="Quay lại" />
          </button>

          <div className="vintage-header-title-ribbon">
            <span className="vintage-title-flourish">
              <span className="flourish-line" />
              <span className="flourish-diamond">◆</span>
            </span>
            <div className="vintage-ribbon-content">
              <BookOpen size={20} className="vintage-title-book-icon" />
              <h1 className="vintage-ribbon-text">{deck.name}</h1>
            </div>
            <span className="vintage-title-flourish is-right">
              <span className="flourish-diamond">◆</span>
              <span className="flourish-line" />
            </span>
          </div>

          <button
            type="button"
            className="vintage-header-settings-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Cài đặt thử thách"
          >
            <Settings size={18} />
            <span>Cài đặt</span>
          </button>
        </header>

        {/* B. VOYAGE NAUTICAL PROGRESS BAR */}
        <div
          className="vintage-voyage-progress-container synonym-compact-voyage"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="vintage-voyage-track">
            <div className="voyage-landmark start-harbor" title="Bến xuất phát">
              <span className="landmark-icon">⚓</span>
              <span className="landmark-label">Bến Cảng</span>
            </div>

            <div className="voyage-sea-line">
              <div
                className="voyage-sea-progress"
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className="voyage-ship-marker"
                style={{ left: `${progressPercent}%` }}
                title={`Đã hoàn thành: ${completedInSession}/${totalInSession} từ`}
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
            <span>
              Tiến độ: <strong>{completedInSession}</strong> / {totalInSession} từ đã hoàn thành ({progressPercent}%)
            </span>
          </div>
        </div>

        {/* C. MAIN PARCHMENT SCROLL WRAPPER */}
        <main className="synonym-parchment-frame" aria-live="polite">
          <div className="parchment-rivet rivet-tl" />
          <div className="parchment-rivet rivet-tr" />
          <div className="parchment-rivet rivet-bl" />
          <div className="parchment-rivet rivet-br" />

          <div className="vintage-synonym-inner-card">
            {/* 1. HERO QUESTION DISPLAY */}
            <section className="vintage-question-hero">
              <div className="hero-word-wrap">
                <h2 className="hero-english-word">{currentItem.term}</h2>
                <button
                  type="button"
                  className="vintage-speaker-btn"
                  onClick={() => speakEnglishTerm(currentItem.term)}
                  title="Phát âm từ gốc"
                  aria-label={`Phát âm ${currentItem.term}`}
                >
                  <Volume2 size={22} />
                  <Ripple />
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

              <div className="hero-task-hint">
                <HelpCircle size={15} />
                <span>
                  Hãy nhập càng nhiều từ đồng nghĩa của từ trên càng tốt. Nhập bằng phím Enter, dấu phẩy hoặc dán nhiều từ cùng lúc.
                </span>
              </div>
            </section>

            {/* 2. CHIP INPUT AREA (Active when question is pending) */}
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
                        title="Nhấn để sửa từ này"
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
                        : 'Nhập tiếp từ khác...'
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
                    Đã nhập <strong>{answerChips.length}</strong> từ đồng nghĩa
                  </span>

                  <button
                    type="button"
                    className="vintage-launch-voyage-btn"
                    onClick={handleSubmit}
                    disabled={evaluating || (answerChips.length === 0 && !inputValue.trim())}
                  >
                    {evaluating ? (
                      <>
                        <Compass size={18} className="spinning-compass" />
                        <span>AI đang phân tích ngữ nghĩa...</span>
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

            {/* 3. EVALUATION RESULTS SECTION */}
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
                        <h3 className="group-title">A. Câu trả lời của bạn ({counts.total} từ)</h3>
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

                {/* B. MISSED SYNONYMS (TOEIC VALUABLE) */}
                {evaluation.missedSynonyms && evaluation.missedSynonyms.length > 0 && (
                  <div className="vintage-result-group">
                    <div className="group-header">
                      <h3 className="group-title">
                        B. Từ đồng nghĩa gợi ý thêm ({evaluation.missedSynonyms.length} từ)
                      </h3>
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
                                >
                                  <Volume2 size={15} />
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
                            {syn.meaning && <div className="missed-meaning">{syn.meaning}</div>}

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
                    <h3 className="group-title">C. Tổng kết từ này</h3>
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
                    className="vintage-outline-btn"
                    onClick={handleRetryCurrent}
                  >
                    <RotateCcw size={16} />
                    <span>Thử lại từ này</span>
                  </button>

                  <button
                    type="button"
                    className="vintage-launch-voyage-btn"
                    onClick={handleNextWord}
                  >
                    <span>{completedInSession + 1 >= queue.length ? 'Cập bến Kho Báu →' : 'Tiếp tục hải trình →'}</span>
                    <ArrowRight size={16} />
                    <Ripple />
                  </button>
                </div>
              </section>
            )}
          </div>
        </main>

        {/* D. FOOTER STATS */}
        <footer className="vintage-voyage-footer-stats">
          <span>Hải trình: {currentIndex + 1} / {allCards.length} từ khảo nghiệm</span>
          <span className="footer-dot">•</span>
          <span>Đã hoàn thành: {completedInSession} / {totalInSession} từ trong phiên</span>
        </footer>
      </div>

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="modal-backdrop" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Cài đặt Phiên thử thách</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsSettingsOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                  Số từ cho mỗi phiên học:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[5, 10, 20, 'all'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`vintage-outline-btn ${sessionBatchSize === size ? 'is-active-filter' : ''}`}
                      style={{
                        padding: '8px 6px',
                        fontSize: '13px',
                        background: sessionBatchSize === size ? '#2E6B38' : '#FAF0DA',
                        color: sessionBatchSize === size ? '#FAF0DA' : '#3B2B1C',
                        fontWeight: 700,
                      }}
                      onClick={() => {
                        setSessionBatchSize(size);
                        localStorage.setItem('synonym_challenge_batch_size', String(size));
                        setIsSettingsOpen(false);
                        initSession(size);
                      }}
                    >
                      {size === 'all' ? 'Tất cả' : `${size} từ`}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #D6C29E', paddingTop: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                  Cấu hình AI Thẩm định (Gemini):
                </label>
                <button
                  type="button"
                  className="vintage-outline-btn"
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setIsKeyModalOpen(true);
                  }}
                >
                  <Key size={16} />
                  <span>{hasCustomKey ? 'Gemini API Key: Đã cài đặt' : 'Cài đặt Gemini API Key'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXIT CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={isExitConfirmOpen}
        title="Dừng phiên thử thách?"
        message="Hải trình của bạn chưa hoàn tất. Tiến độ của các từ bạn đã làm trong phiên này vẫn được ghi nhận an toàn."
        confirmText="Rời khỏi"
        cancelText="Tiếp tục học"
        onConfirm={() => {
          setIsExitConfirmOpen(false);
          navigate(`/decks/${deckId}`);
        }}
        onCancel={() => setIsExitConfirmOpen(false)}
      />

      {/* GEMINI KEY MODAL */}
      <GeminiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeySaved={() => {
          setHasCustomKey(true);
          showToast('Đã lưu Gemini API Key thành công!', 'success');
        }}
      />

      {/* TOAST NOTIFICATION */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
