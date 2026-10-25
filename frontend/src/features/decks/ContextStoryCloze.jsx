import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BookOpen,
  Volume2,
  Square,
  Languages,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowLeft,
  XCircle,
} from 'lucide-react';
import { contextStoryService } from '../../services/contextStoryService';
import { studyService } from '../../services/studyService';
import { generateClientAnswerId } from '../../utils/progressSync';
import { checkAnswer } from '../../utils/checkAnswer';
import './ContextStoryCloze.css';

export default function ContextStoryCloze({
  cards = [],
  deck = null,
  onToast,
  onBackToCard,
}) {
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [revealedHints, setRevealedHints] = useState({});
  const [showTranslation, setShowTranslation] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [isSavingSession, setIsSavingSession] = useState(false);

  const audioUtteranceRef = useRef(null);
  const inputsRef = useRef({});

  // Sync available voices for SpeechSynthesis (handles Chrome/Edge async loading)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setAvailableVoices(v);
      }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Load contextual story
  const loadStory = useCallback(async () => {
    if (!cards || cards.length === 0) return;
    setLoading(true);
    setResults(null);
    setUserAnswers({});
    setRevealedHints({});
    try {
      const generated = await contextStoryService.getContextStory(
        deck?.id,
        cards,
        deck?.name
      );
      setStory(generated);
    } catch (err) {
      onToast?.(err.message || 'Không thể tạo đoạn văn ngữ cảnh', 'error');
    } finally {
      setLoading(false);
    }
  }, [cards, deck, onToast]);

  useEffect(() => {
    loadStory();
  }, [loadStory]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Map of all blanks by blank index
  const blanksMap = useMemo(() => {
    const map = {};
    if (!story?.paragraphs) return map;
    story.paragraphs.forEach((p) => {
      p.blanks.forEach((b) => {
        map[b.index] = b;
      });
    });
    return map;
  }, [story]);

  // Handle User Input change
  const handleInputChange = (blankIndex, value) => {
    setUserAnswers((prev) => ({
      ...prev,
      [blankIndex]: value,
    }));
  };

  // Toggle Hint for a blank
  const handleToggleHint = (blankIndex) => {
    setRevealedHints((prev) => ({
      ...prev,
      [blankIndex]: !prev[blankIndex],
    }));
  };

  // Handle Enter navigation across cloze blanks
  const handleInputKeyDown = (e, currentBlankIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const sortedIndices = Object.keys(blanksMap)
        .map(Number)
        .sort((a, b) => a - b);
      const currentPos = sortedIndices.indexOf(currentBlankIndex);
      if (currentPos !== -1 && currentPos < sortedIndices.length - 1) {
        const nextIdx = sortedIndices[currentPos + 1];
        inputsRef.current[nextIdx]?.focus();
      } else {
        handleCheckAnswers();
      }
    }
  };

  // Check answers and synchronize session to backend
  const handleCheckAnswers = async () => {
    if (!story || isSavingSession) return;

    const evalResults = {};
    let correctCount = 0;
    const total = story.totalBlanks || Object.keys(blanksMap).length;

    Object.values(blanksMap).forEach((blank) => {
      const userText = userAnswers[blank.index] || '';
      // Card representation for checkAnswer
      const cardObj = {
        id: blank.cardId,
        term: blank.term,
        definition: blank.definition,
        synonyms: blank.synonyms || [],
      };

      const res = checkAnswer(userText, cardObj, 'VI_TO_EN', {
        ignoreDiacritics: true,
        acceptSynonyms: true,
      });

      evalResults[blank.index] = res;
      if (res.result === 'correct' || res.result === 'accepted') {
        correctCount++;
      }
    });

    setResults({
      evalResults,
      correctCount,
      total,
      percent: Math.round((correctCount / (total || 1)) * 100),
    });

    onToast?.(
      `Đã kiểm tra xong: ${correctCount}/${total} từ chính xác!`,
      correctCount === total ? 'success' : 'info'
    );

    // Record session & answers to backend studyService
    if (deck?.id) {
      setIsSavingSession(true);
      try {
        const sessionRes = await studyService.createSession({
          deckId: deck.id,
          direction: 'VI_TO_EN',
          plannedCount: total,
          order: 'random',
        });

        if (sessionRes?.id) {
          const answers = Object.values(blanksMap)
            .filter((blank) => blank.cardId)
            .map((blank) => {
              const evalRes = evalResults[blank.index];
              const isCorrect =
                evalRes?.result === 'correct' || evalRes?.result === 'accepted';
              return {
                clientAnswerId: generateClientAnswerId(),
                vocabularyId: blank.cardId,
                direction: 'VI_TO_EN',
                result: isCorrect ? 'CORRECT' : 'WRONG',
                override: false,
                userAnswer: userAnswers[blank.index] || '',
                attemptNo: 1,
              };
            });

          if (answers.length > 0) {
            await studyService.recordAnswers(sessionRes.id, answers);
          }
          await studyService.finishSession(sessionRes.id, {
            totalQuestions: total,
            correctCount,
          });
        }
      } catch (err) {
        console.warn('Lỗi ghi nhận kết quả bài học ngữ cảnh:', err);
      } finally {
        setIsSavingSession(false);
      }
    }
  };

  // Reset inputs
  const handleReset = () => {
    setUserAnswers({});
    setResults(null);
    setRevealedHints({});
    onToast?.('Đã đặt lại câu trả lời', 'info');
  };

  // Audio Playback
  const handleToggleAudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onToast?.('Trình duyệt không hỗ trợ phát âm giọng nói', 'warning');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    if (!story?.paragraphs) return;

    // Build the complete English narrative with target inflected words filled in
    const fullText = story.paragraphs
      .map((p) => {
        let text = p.text;
        p.blanks.forEach((b) => {
          const placeholder = `{{${b.index}}}`;
          text = text.replace(placeholder, b.matchedWord || b.term);
        });
        return text;
      })
      .join(' ');

    try {
      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(fullText);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;

      const voices =
        availableVoices.length > 0
          ? availableVoices
          : window.speechSynthesis.getVoices();
      const enVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.lang.includes('US') || v.name.includes('English') || v.lang.includes('GB'))
        ) || voices.find((v) => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;

      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          onToast?.('Không thể phát âm đoạn văn', 'warning');
        }
        setIsPlayingAudio(false);
      };

      audioUtteranceRef.current = utterance;
      setIsPlayingAudio(true);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setIsPlayingAudio(false);
      onToast?.(err.message || 'Lỗi khi đọc âm thanh', 'error');
    }
  };

  // Helper to render paragraph with inline cloze blanks
  const renderParagraph = (paragraph) => {
    const rawText = paragraph.text;
    const parts = rawText.split(/({{\d+}})/g);

    return (
      <div key={paragraph.paragraphIndex} className="story-paragraph-block">
        <div className="story-text-flow">
          {parts.map((part, idx) => {
            const match = part.match(/{{(\d+)}}/);
            if (!match) {
              return <span key={idx}>{part}</span>;
            }

            const blankIndex = parseInt(match[1], 10);
            const blank = blanksMap[blankIndex];
            if (!blank) return null;

            const isEvaluated = Boolean(results?.evalResults);
            const evalResult = results?.evalResults?.[blankIndex];
            const isHintRevealed = Boolean(revealedHints[blankIndex]);

            let inputClass = 'cloze-input';
            if (isEvaluated && evalResult) {
              if (
                evalResult.result === 'correct' ||
                evalResult.result === 'accepted'
              ) {
                inputClass += ' status-correct';
              } else if (evalResult.result === 'almost') {
                inputClass += ' status-almost';
              } else {
                inputClass += ' status-wrong';
              }
            }

            const firstLetterHint = blank.term
              ? `${blank.term[0]}${'_'.repeat(Math.max(1, blank.term.length - 1))}`
              : '';

            return (
              <span key={idx} className="cloze-blank-wrapper">
                <input
                  ref={(el) => {
                    if (el) inputsRef.current[blankIndex] = el;
                    else delete inputsRef.current[blankIndex];
                  }}
                  type="text"
                  className={inputClass}
                  value={userAnswers[blankIndex] || ''}
                  onChange={(e) =>
                    handleInputChange(blankIndex, e.target.value)
                  }
                  onKeyDown={(e) => handleInputKeyDown(e, blankIndex)}
                  placeholder={`(${blankIndex + 1})`}
                  disabled={isEvaluated || isSavingSession}
                  aria-label={`Ô trống ${blankIndex + 1}: ${blank.definition}`}
                />

                {!isEvaluated && (
                  <button
                    type="button"
                    className={`cloze-hint-btn ${isHintRevealed ? 'is-revealed' : ''}`}
                    onClick={() => handleToggleHint(blankIndex)}
                    title={
                      isHintRevealed
                        ? 'Ẩn gợi ý'
                        : `Gợi ý: ${blank.definition} (${firstLetterHint})`
                    }
                    aria-label={`Gợi ý ô trống ${blankIndex + 1}`}
                  >
                    <HelpCircle size={14} />
                  </button>
                )}

                {/* Status chips after grading */}
                {isEvaluated && evalResult && (
                  <>
                    {(evalResult.result === 'correct' ||
                      evalResult.result === 'accepted') && (
                      <span className="cloze-status-chip is-correct">
                        <CheckCircle2 size={13} />
                        <span>Đúng</span>
                      </span>
                    )}

                    {evalResult.result === 'almost' && (
                      <span
                        className="cloze-status-chip is-almost"
                        title="Gần đúng (kiểm tra lại chính tả)"
                      >
                        <AlertCircle size={13} />
                        <span>Gần đúng</span>
                      </span>
                    )}

                    {evalResult.result === 'wrong' && (
                      <span
                        className="cloze-status-chip is-wrong"
                        title={`Đáp án đúng: ${blank.term}`}
                      >
                        <XCircle size={13} />
                        <span>{blank.term}</span>
                      </span>
                    )}
                  </>
                )}

                {/* Hint banner when clicked */}
                {isHintRevealed && !isEvaluated && (
                  <span className="blank-hint-banner">
                    💡 <strong>{blank.definition}</strong> [{firstLetterHint}]
                  </span>
                )}
              </span>
            );
          })}
        </div>

        {/* Optional Vietnamese Translation */}
        {showTranslation && paragraph.translation && (
          <div className="story-translation-box">
            <span>🇻🇳 {paragraph.translation}</span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="context-story-container">
        <div className="story-content-card" style={{ textAlign: 'center', padding: '40px' }}>
          <RotateCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
          <p>Đang tạo đoạn văn ngữ cảnh theo bộ từ vựng...</p>
        </div>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="context-story-container">
        <div className="story-content-card" style={{ textAlign: 'center', padding: '30px' }}>
          <p>Bộ từ vựng này chưa có thẻ nào để tạo đoạn văn ngữ cảnh.</p>
          {onBackToCard && (
            <button
              type="button"
              className="story-action-btn"
              onClick={onBackToCard}
              style={{ margin: '16px auto 0 auto' }}
            >
              <ArrowLeft size={16} />
              <span>Về thẻ Flashcard</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="context-story-container">
      {/* 1. Header Toolbar */}
      <div className="story-header-bar">
        <div className="story-header-left">
          {onBackToCard && (
            <button
              type="button"
              className="story-action-btn"
              onClick={onBackToCard}
              title="Quay lại học thẻ Flashcard"
            >
              <ArrowLeft size={15} />
              <span>Thẻ Flashcard</span>
            </button>
          )}

          <div className="story-title-badge">
            <BookOpen size={18} />
            <span>{story?.title || 'Đoạn văn ngữ cảnh điền từ'}</span>
          </div>
        </div>

        <div className="story-header-actions">
          {/* Read aloud TTS button */}
          <button
            type="button"
            className={`story-action-btn ${isPlayingAudio ? 'is-active' : ''}`}
            onClick={handleToggleAudio}
            title={isPlayingAudio ? 'Dừng đọc' : 'Nghe đọc toàn bộ đoạn văn tiếng Anh'}
          >
            {isPlayingAudio ? <Square size={15} /> : <Volume2 size={15} />}
            <span>{isPlayingAudio ? 'Dừng đọc' : 'Nghe đọc'}</span>
          </button>

          {/* Bilingual toggle button */}
          <button
            type="button"
            className={`story-action-btn ${showTranslation ? 'is-active' : ''}`}
            onClick={() => setShowTranslation(!showTranslation)}
            title="Bật/Tắt bản dịch tiếng Việt song ngữ"
          >
            <Languages size={15} />
            <span>{showTranslation ? 'Ẩn dịch nghĩa' : 'Hiện dịch nghĩa'}</span>
          </button>

          {/* Regenerate story button */}
          <button
            type="button"
            className="story-action-btn"
            onClick={loadStory}
            disabled={loading}
            title="Tạo lại đoạn văn ngữ cảnh khác"
          >
            <RotateCw size={15} />
            <span>Tạo đoạn mới</span>
          </button>
        </div>
      </div>

      {/* 2. Main Story Card with Blanks */}
      <div className="story-content-card">
        {story?.paragraphs?.map((p) => renderParagraph(p))}
      </div>

      {/* 3. Evaluation & Action Footer */}
      {results && (
        <div className="story-evaluation-card">
          <div className="evaluation-summary-row">
            <div className="evaluation-score-text">
              Kết quả: {results.correctCount} / {results.total} từ chính xác ({results.percent}%)
            </div>

            <div
              className={`evaluation-score-badge ${
                results.percent >= 80 ? 'high' : results.percent >= 50 ? 'mid' : 'low'
              }`}
            >
              <Sparkles size={14} />
              <span>
                {results.percent === 100
                  ? 'Xuất sắc! Bạn làm chủ hoàn hảo toàn bộ từ vựng!'
                  : results.percent >= 80
                  ? 'Rất tốt! Khả năng nhớ từ theo ngữ cảnh rất vững vàng.'
                  : 'Hãy ôn lại các từ chưa đúng và thử làm lại nhé!'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="story-actions-footer">
        {results ? (
          <>
            <button
              type="button"
              className="story-reset-btn"
              onClick={handleReset}
            >
              <span>Làm lại đoạn này</span>
            </button>
            <button
              type="button"
              className="story-submit-btn"
              onClick={loadStory}
            >
              <RotateCw size={15} />
              <span>Thử đoạn văn mới</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            className="story-submit-btn"
            onClick={handleCheckAnswers}
            disabled={!story || isSavingSession}
          >
            <CheckCircle2 size={16} />
            <span>{isSavingSession ? 'Đang lưu kết quả...' : 'Kiểm tra đáp án'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
