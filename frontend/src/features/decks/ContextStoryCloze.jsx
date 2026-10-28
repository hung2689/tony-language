import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Volume2,
  Square,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  XCircle,
  Key,
  Clock,
  Settings,
  ChevronDown,
  Lightbulb,
  X,
  Play,
  Pause,
  Languages,
  Check,
} from 'lucide-react';
import GeminiKeyModal from '../../components/common/GeminiKeyModal';
import Ripple from '../../components/common/Ripple';
import { contextStoryService } from '../../services/contextStoryService';
import { studyService } from '../../services/studyService';
import { generateClientAnswerId } from '../../utils/progressSync';
import { checkAnswer } from '../../utils/checkAnswer';
import './ContextStoryCloze.css';

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5];
const DISPLAY_MODES = [
  { id: 'en', label: 'Chỉ tiếng Anh' },
  { id: 'both', label: 'Hiện tất cả dịch' },
  { id: 'vi', label: 'Chỉ tiếng Việt' },
];

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
  const [activeBlankIndex, setActiveBlankIndex] = useState(null);
  const [displayMode, setDisplayMode] = useState('en');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isWordBankOpen, setIsWordBankOpen] = useState(true);
  const [sentenceTranslations, setSentenceTranslations] = useState({});
  const [paragraphTranslations, setParagraphTranslations] = useState({});
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [playingSentenceId, setPlayingSentenceId] = useState(null);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [storyError, setStoryError] = useState(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [availableVoices, setAvailableVoices] = useState([]);

  const inputsRef = useRef({});
  const audioIntervalRef = useRef(null);
  const dropdownRef = useRef(null);
  const lastLoadedDeckIdRef = useRef(null);

  // Sync available voices for SpeechSynthesis
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) setAvailableVoices(v);
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Load History from localStorage
  const historyStorageKey = useMemo(() => {
    return deck?.id ? `context_story_history_${deck.id}` : 'context_story_history_all';
  }, [deck?.id]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(historyStorageKey);
      if (stored) {
        setHistoryList(JSON.parse(stored));
      }
    } catch {
      // ignore JSON parse error
    }
  }, [historyStorageKey]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Load story from AI
  const loadStory = useCallback(
    async (force = false) => {
      if (!deck?.id || !cards || cards.length === 0) return;
      if (!force && lastLoadedDeckIdRef.current === deck.id && story) return;

      setLoading(true);
      setStoryError(null);
      setResults(null);
      setUserAnswers({});
      setActiveBlankIndex(null);
      setSentenceTranslations({});
      setParagraphTranslations({});
      setPlayingSentenceId(null);
      setIsPlayingAudio(false);
      setAudioProgress(0);
      lastLoadedDeckIdRef.current = deck.id;

      try {
        const generated = await contextStoryService.getContextStory(deck.id);
        setStory(generated);
      } catch (err) {
        const msg = err.message || 'Không thể tạo đoạn văn bằng AI Gemini.';
        setStoryError(msg);
        onToast?.(msg, 'error');
      } finally {
        setLoading(false);
      }
    },
    [deck?.id, cards, story, onToast]
  );

  useEffect(() => {
    if (deck?.id && lastLoadedDeckIdRef.current !== deck.id) {
      loadStory(false);
    }
  }, [deck?.id, loadStory]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, []);

  // Blanks mapping
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

  const allBlankIndices = useMemo(() => {
    return Object.keys(blanksMap).map(Number).sort((a, b) => a - b);
  }, [blanksMap]);

  // Target vocabulary word bank list
  const wordBankItems = useMemo(() => {
    if (!story?.paragraphs) return [];
    const items = [];
    const seenMap = new Map();

    story.paragraphs.forEach((p) => {
      p.blanks.forEach((b) => {
        const word = b.term || b.matchedWord;
        if (!word) return;
        const key = word.toLowerCase();
        if (!seenMap.has(key)) {
          seenMap.set(key, {
            id: `word-${b.index}`,
            term: word,
            blankIndex: b.index,
          });
        }
      });
    });

    return Array.from(seenMap.values());
  }, [story]);

  // Count how many blanks are filled
  const filledCount = useMemo(() => {
    return allBlankIndices.filter((idx) => Boolean(userAnswers[idx]?.trim())).length;
  }, [allBlankIndices, userAnswers]);

  // Check if a word from the bank is currently used in any blank
  const isWordUsedInStory = useCallback(
    (term) => {
      if (!term) return false;
      const lower = term.toLowerCase().trim();
      return Object.values(userAnswers).some((ans) => ans?.toLowerCase().trim() === lower);
    },
    [userAnswers]
  );

  // Cycle playback speed
  const handleCycleSpeed = () => {
    setPlaybackSpeed((prev) => {
      const curIdx = PLAYBACK_SPEEDS.indexOf(prev);
      const nextIdx = (curIdx + 1) % PLAYBACK_SPEEDS.length;
      return PLAYBACK_SPEEDS[nextIdx];
    });
  };

  // Change user answer for a blank
  const handleInputChange = (blankIndex, value) => {
    setUserAnswers((prev) => ({
      ...prev,
      [blankIndex]: value,
    }));
  };

  // Click on a word from the Word Bank
  const handleWordBankSelect = (term) => {
    if (!term || results) return;

    // 1. If user has an active empty blank, put it there
    let targetIdx = activeBlankIndex;
    if (targetIdx === null || userAnswers[targetIdx]?.trim()) {
      // Find the first unfilled blank
      const firstEmpty = allBlankIndices.find((idx) => !userAnswers[idx]?.trim());
      if (firstEmpty !== undefined) {
        targetIdx = firstEmpty;
      }
    }

    if (targetIdx !== null && targetIdx !== undefined) {
      setUserAnswers((prev) => ({
        ...prev,
        [targetIdx]: term,
      }));

      // Find next empty blank to auto-advance focus
      const nextEmpty = allBlankIndices.find(
        (idx) => idx > targetIdx && !userAnswers[idx]?.trim()
      );
      if (nextEmpty !== undefined) {
        setActiveBlankIndex(nextEmpty);
        inputsRef.current[nextEmpty]?.focus();
      } else {
        setActiveBlankIndex(null);
      }
    }
  };

  // Clear a blank
  const handleClearBlank = (blankIndex) => {
    if (results) return;
    setUserAnswers((prev) => {
      const next = { ...prev };
      delete next[blankIndex];
      return next;
    });
    setActiveBlankIndex(blankIndex);
  };

  // Handle keyboard Enter navigation
  const handleInputKeyDown = (e, currentBlankIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentPos = allBlankIndices.indexOf(currentBlankIndex);
      if (currentPos !== -1 && currentPos < allBlankIndices.length - 1) {
        const nextIdx = allBlankIndices[currentPos + 1];
        setActiveBlankIndex(nextIdx);
        inputsRef.current[nextIdx]?.focus();
      } else {
        handleCheckAnswers();
      }
    }
  };

  // Toggle whole paragraph translation
  const handleToggleParagraphTranslation = (paragraphIndex) => {
    setParagraphTranslations((prev) => ({
      ...prev,
      [paragraphIndex]: !prev[paragraphIndex],
    }));
  };

  // Toggle single sentence translation
  const handleToggleSentenceTranslation = (sentenceId) => {
    setSentenceTranslations((prev) => ({
      ...prev,
      [sentenceId]: !prev[sentenceId],
    }));
  };

  // Speak single sentence
  const handleSpeakSentence = (sentenceText, sentenceId) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onToast?.('Trình duyệt không hỗ trợ phát âm giọng nói', 'warning');
      return;
    }

    // Cancel any existing speech
    window.speechSynthesis.cancel();
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    setIsPlayingAudio(false);

    if (playingSentenceId === sentenceId) {
      setPlayingSentenceId(null);
      return;
    }

    // Replace any {{index}} with matchedWord or user's answer
    const spokenText = sentenceText.replace(/{{\d+}}/g, (match) => {
      const num = parseInt(match.replace(/\D/g, ''), 10);
      return userAnswers[num] || blanksMap[num]?.matchedWord || blanksMap[num]?.term || '';
    });

    try {
      const utterance = new window.SpeechSynthesisUtterance(spokenText.trim());
      utterance.lang = 'en-US';
      utterance.rate = playbackSpeed;

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

      utterance.onstart = () => setPlayingSentenceId(sentenceId);
      utterance.onend = () => setPlayingSentenceId(null);
      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          onToast?.('Không thể đọc câu này', 'warning');
        }
        setPlayingSentenceId(null);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setPlayingSentenceId(null);
      onToast?.(err.message || 'Lỗi khi phát âm câu', 'error');
    }
  };

  // Audio Playback for Full Story
  const handleToggleAudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onToast?.('Trình duyệt không hỗ trợ phát âm giọng nói', 'warning');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      setIsPlayingAudio(false);
      setAudioProgress(0);
      return;
    }

    if (!story?.paragraphs) return;

    // Full English narrative
    const fullText = story.paragraphs
      .map((p) => {
        let text = p.text;
        p.blanks.forEach((b) => {
          const placeholder = `{{${b.index}}}`;
          text = text.replace(placeholder, userAnswers[b.index] || b.matchedWord || b.term);
        });
        return text;
      })
      .join(' ');

    try {
      window.speechSynthesis.cancel();
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);

      const utterance = new window.SpeechSynthesisUtterance(fullText);
      utterance.lang = 'en-US';
      utterance.rate = playbackSpeed;

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

      // Estimate duration based on word count & rate
      const wordCount = fullText.split(/\s+/).length;
      const estimatedSeconds = Math.max(3, (wordCount / (140 * playbackSpeed)) * 60);

      utterance.onstart = () => {
        setIsPlayingAudio(true);
        setAudioProgress(0);
        const startTime = Date.now();
        audioIntervalRef.current = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          const prog = Math.min(98, Math.round((elapsed / estimatedSeconds) * 100));
          setAudioProgress(prog);
        }, 150);
      };

      utterance.onend = () => {
        if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
        setAudioProgress(100);
        setTimeout(() => {
          setIsPlayingAudio(false);
          setAudioProgress(0);
        }, 300);
      };

      utterance.onerror = (e) => {
        if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          onToast?.('Không thể phát âm đoạn văn', 'warning');
        }
        setIsPlayingAudio(false);
        setAudioProgress(0);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      setIsPlayingAudio(false);
      setAudioProgress(0);
      onToast?.(err.message || 'Lỗi khi đọc âm thanh', 'error');
    }
  };

  // Check answers
  const handleCheckAnswers = async () => {
    if (!story || isSavingSession) return;

    const evalResults = {};
    let correctCount = 0;
    const total = story.totalBlanks || allBlankIndices.length || 1;

    allBlankIndices.forEach((idx) => {
      const blank = blanksMap[idx];
      if (!blank) return;

      const userText = userAnswers[idx] || '';
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

      evalResults[idx] = res;
      if (res.result === 'correct' || res.result === 'accepted') {
        correctCount++;
      }
    });

    const percent = Math.round((correctCount / total) * 100);
    const newResults = {
      evalResults,
      correctCount,
      total,
      percent,
    };
    setResults(newResults);

    // Save attempt to history
    const historyItem = {
      id: Date.now(),
      date: new Date().toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      title: story.title || 'Đoạn văn ngữ cảnh',
      score: `${correctCount}/${total}`,
      percent,
    };

    try {
      const updatedHistory = [historyItem, ...historyList].slice(0, 20);
      setHistoryList(updatedHistory);
      localStorage.setItem(historyStorageKey, JSON.stringify(updatedHistory));
    } catch {
      // ignore localStorage error
    }

    onToast?.(
      `Đã kiểm tra xong: ${correctCount}/${total} từ chính xác!`,
      correctCount === total ? 'success' : 'info'
    );

    // Save session to backend
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
          const answers = allBlankIndices
            .map((idx) => blanksMap[idx])
            .filter((blank) => blank && blank.cardId)
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

  // Reset current answers
  const handleReset = () => {
    setUserAnswers({});
    setResults(null);
    setActiveBlankIndex(null);
    setParagraphTranslations({});
    setSentenceTranslations({});
    onToast?.('Đã đặt lại câu trả lời', 'info');
  };

  // Helper to split a paragraph text into sentences
  const parsedParagraphSentences = useMemo(() => {
    if (!story?.paragraphs) return [];

    return story.paragraphs.map((p, pIdx) => {
      // Split by sentence delimiters (. ? !)
      const rawSentences = p.text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [p.text];
      const rawTranslations = p.translation
        ? p.translation.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [p.translation]
        : [];

      const sentences = rawSentences.map((rawSent, sIdx) => {
        const sentId = `p${pIdx}-s${sIdx}`;
        const sentTrans = rawTranslations[sIdx]?.trim() || '';
        return {
          id: sentId,
          text: rawSent.trim(),
          translation: sentTrans,
        };
      });

      return {
        ...p,
        sentences,
      };
    });
  }, [story]);

  // Loading state
  if (loading) {
    return (
      <div className="context-story-wrapper">
        <div className="story-loading-card">
          <div className="story-loading-avatar-wrap">
            <Ripple className="w-14 h-14 text-emerald-500" />
          </div>
          <h3 className="story-loading-title">
            AI đang sáng tạo các đoạn văn ngữ cảnh tự nhiên...
          </h3>
          <p className="story-loading-subtitle">
            Phân tích và kết hợp từ vựng theo tình huống đời thường gần gũi (chuẩn CEFR A2-B1)...
          </p>
          <div className="story-loading-skeletons">
            <div className="story-skeleton-line" style={{ width: '100%' }} />
            <div className="story-skeleton-line" style={{ width: '85%' }} />
            <div className="story-skeleton-line" style={{ width: '92%' }} />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (storyError && !story && !loading) {
    return (
      <div className="context-story-wrapper">
        <div className="story-error-card">
          <AlertCircle size={40} className="story-error-icon" />
          <h3 className="story-error-title">Không thể tạo đoạn văn với AI Gemini</h3>
          <p className="story-error-desc">{storyError}</p>
          <div className="story-error-actions">
            <button
              type="button"
              className="btn-retry-primary"
              onClick={() => loadStory(true)}
            >
              <RotateCw size={16} />
              <span>Thử lại bằng AI</span>
            </button>
            <button
              type="button"
              className="btn-settings-secondary"
              onClick={() => setIsKeyModalOpen(true)}
            >
              <Key size={16} />
              <span>Cài đặt Gemini API Key</span>
            </button>
            {onBackToCard && (
              <button
                type="button"
                className="btn-settings-secondary"
                onClick={onBackToCard}
              >
                <ArrowLeft size={16} />
                <span>Quay lại</span>
              </button>
            )}
          </div>
        </div>
        {isKeyModalOpen && (
          <GeminiKeyModal
            isOpen={isKeyModalOpen}
            onClose={() => setIsKeyModalOpen(false)}
            onSuccess={() => {
              setIsKeyModalOpen(false);
              loadStory(true);
            }}
          />
        )}
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="context-story-wrapper">
        <div className="story-error-card">
          <p>Bộ từ vựng này chưa có thẻ nào để tạo đoạn văn ngữ cảnh.</p>
          {onBackToCard && (
            <button
              type="button"
              className="btn-retry-primary"
              onClick={onBackToCard}
              style={{ marginTop: '16px' }}
            >
              <ArrowLeft size={16} />
              <span>Quay lại</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentDisplayModeLabel =
    DISPLAY_MODES.find((m) => m.id === displayMode)?.label || 'Cả hai';

  // Calculate Segment Count (matches blanks count, min 5)
  const segmentCount = Math.max(allBlankIndices.length, 5);

  return (
    <div className="context-story-wrapper">
      {/* 1. TOP HEADER BAR */}
      <div className="story-top-nav-bar">
        <div className="story-nav-left">
          {onBackToCard && (
            <button
              type="button"
              className="story-nav-btn story-back-btn"
              onClick={onBackToCard}
              title="Quay lại học thẻ flashcard"
            >
              <ArrowLeft size={16} />
              <span>Quay lại</span>
            </button>
          )}
        </div>

        <div className="story-nav-right">
          <button
            type="button"
            className="story-nav-btn"
            onClick={() => setIsHistoryModalOpen(true)}
            title="Xem lịch sử làm bài"
          >
            <Clock size={16} />
            <span>Lịch sử</span>
          </button>

          <button
            type="button"
            className="story-nav-btn"
            onClick={() => setIsSettingsModalOpen(true)}
            title="Cài đặt bài học"
          >
            <Settings size={16} />
            <span>Cài đặt</span>
          </button>
        </div>
      </div>

      {/* 2. SEGMENTED PROGRESS BAR */}
      <div className="segmented-progress-container" aria-label="Tiến độ hoàn thành bài">
        {Array.from({ length: segmentCount }).map((_, sIdx) => {
          // A segment is active/filled if user has filled that blank
          const isFilled = sIdx < filledCount;
          const isCurrent = sIdx === filledCount && !results;

          return (
            <div
              key={sIdx}
              className={`progress-segment ${isFilled ? 'is-completed' : ''} ${
                isCurrent ? 'is-active' : ''
              }`}
            />
          );
        })}
      </div>

      {/* 3. CENTERED STORY TITLE */}
      <div className="story-hero-title-section">
        <h1 className="story-hero-title">
          {story?.paragraphs?.[0]?.title || story?.title || 'Mia at School'}
        </h1>
      </div>

      {/* 4. AUDIO PLAYER BAR */}
      <div className="story-audio-player-pill">
        <button
          type="button"
          className="audio-play-circle-btn"
          onClick={handleToggleAudio}
          title={isPlayingAudio ? 'Tạm dừng đọc' : 'Nghe bài đọc'}
          aria-label={isPlayingAudio ? 'Tạm dừng' : 'Phát âm'}
        >
          {isPlayingAudio ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} />
          )}
        </button>

        <div className="audio-timeline-track-wrap">
          <div className="audio-timeline-label">Nghe bài đọc</div>
          <div
            className="audio-timeline-track"
            role="progressbar"
            aria-valuenow={audioProgress}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              className="audio-timeline-fill"
              style={{ width: `${audioProgress}%` }}
            />
            {isPlayingAudio && (
              <div
                className="audio-timeline-thumb"
                style={{ left: `${audioProgress}%` }}
              />
            )}
          </div>
        </div>

        <button
          type="button"
          className="audio-speed-pill-btn"
          onClick={handleCycleSpeed}
          title="Chạm để đổi tốc độ đọc"
        >
          {playbackSpeed}x
        </button>
      </div>

      {/* 5. SUB-TOOLBAR */}
      <div className="story-sub-toolbar">
        {/* Language View Mode Dropdown */}
        <div className="dropdown-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className="sub-toolbar-btn dropdown-trigger"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
          >
            <span>{currentDisplayModeLabel}</span>
            <ChevronDown size={14} className={isDropdownOpen ? 'rotate-180' : ''} />
          </button>

          {isDropdownOpen && (
            <div className="dropdown-menu">
              {DISPLAY_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`dropdown-item ${displayMode === mode.id ? 'is-selected' : ''}`}
                  onClick={() => {
                    setDisplayMode(mode.id);
                    setIsDropdownOpen(false);
                  }}
                >
                  <span>{mode.label}</span>
                  {displayMode === mode.id && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Word Bank Toggle Button */}
        <button
          type="button"
          className={`sub-toolbar-btn word-bank-toggle-btn ${
            isWordBankOpen ? 'is-active' : ''
          }`}
          onClick={() => setIsWordBankOpen((prev) => !prev)}
        >
          <Lightbulb size={15} />
          <span>Ngân hàng từ</span>
        </button>
      </div>

      {/* 6. WORD BANK BOX */}
      {isWordBankOpen && (
        <div className="story-word-bank-box">
          <div className="word-bank-header-label">Ngân hàng từ:</div>
          <div className="word-bank-pills-list">
            {wordBankItems.map((item) => {
              const isUsed = isWordUsedInStory(item.term);

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`word-bank-pill ${isUsed ? 'is-used' : 'is-available'}`}
                  onClick={() => !isUsed && handleWordBankSelect(item.term)}
                  disabled={isUsed || Boolean(results)}
                  title={
                    isUsed
                      ? `Từ '${item.term}' đã được điền vào câu`
                      : `Bấm để điền '${item.term}' vào ô trống`
                  }
                >
                  {item.term}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. PARAGRAPH STORY CARDS */}
      <div className="story-paragraphs-container">
        {parsedParagraphSentences.map((paragraph, pIdx) => {
          const isParagraphTransOpen = Boolean(paragraphTranslations[pIdx]);

          return (
            <div key={pIdx} className="story-paragraph-card">
              <div className="story-paragraph-header-row">
                {paragraph.topic ? (
                  <div className="story-topic-badge">
                    🎯 {paragraph.topic}
                  </div>
                ) : <div />}

                <button
                  type="button"
                  className={`paragraph-translate-btn ${isParagraphTransOpen ? 'is-active' : ''}`}
                  onClick={() => handleToggleParagraphTranslation(pIdx)}
                  title={isParagraphTransOpen ? 'Ẩn bản dịch cả đoạn văn' : 'Dịch cả đoạn văn'}
                >
                  <Languages size={15} />
                  <span>{isParagraphTransOpen ? 'Ẩn bản dịch' : 'Dịch cả đoạn văn'}</span>
                </button>
              </div>

              <div className="story-sentences-flow">
                {paragraph.sentences.map((sent) => {
                  const parts = sent.text.split(/({{\d+}})/g);
                  const isSentPlaying = playingSentenceId === sent.id;
                  const isSentTransToggled = Boolean(sentenceTranslations[sent.id]);
                  const showSentTrans =
                    (displayMode === 'both' || isParagraphTransOpen || isSentTransToggled) &&
                    sent.translation;

                return (
                  <div key={sent.id} className="sentence-unit-block">
                    {/* Primary English line with cloze blanks */}
                    {displayMode !== 'vi' && (
                      <div className="sentence-text-row">
                        <span className="sentence-words">
                          {parts.map((part, partIdx) => {
                            const match = part.match(/{{(\d+)}}/);
                            if (!match) {
                              return <span key={partIdx}>{part}</span>;
                            }

                            const blankIndex = parseInt(match[1], 10);
                            const blank = blanksMap[blankIndex];
                            if (!blank) return null;

                            const userAnswer = userAnswers[blankIndex] || '';
                            const isFilled = Boolean(userAnswer.trim());
                            const isFocused = activeBlankIndex === blankIndex;
                            const isEvaluated = Boolean(results?.evalResults);
                            const evalResult = results?.evalResults?.[blankIndex];

                            let statusClass = '';
                            if (isEvaluated && evalResult) {
                              if (
                                evalResult.result === 'correct' ||
                                evalResult.result === 'accepted'
                              ) {
                                statusClass = 'is-correct';
                              } else {
                                statusClass = 'is-wrong';
                              }
                            }

                            return (
                              <span
                                key={partIdx}
                                className={`cloze-slot-pill ${
                                  isFilled ? 'is-filled' : 'is-empty'
                                } ${isFocused ? 'is-focused' : ''} ${statusClass}`}
                                onClick={() => {
                                  if (!isEvaluated) {
                                    setActiveBlankIndex(blankIndex);
                                    inputsRef.current[blankIndex]?.focus();
                                  }
                                }}
                              >
                                {isFilled ? (
                                  <span className="cloze-slot-filled-content">
                                    <span className="cloze-filled-term">
                                      {userAnswer}
                                    </span>
                                    {!isEvaluated && (
                                      <button
                                        type="button"
                                        className="cloze-remove-word-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleClearBlank(blankIndex);
                                        }}
                                        title="Xóa từ khỏi ô"
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                  </span>
                                ) : (
                                  <input
                                    ref={(el) => {
                                      if (el) inputsRef.current[blankIndex] = el;
                                      else delete inputsRef.current[blankIndex];
                                    }}
                                    type="text"
                                    className="cloze-inline-input"
                                    value={userAnswer}
                                    onChange={(e) =>
                                      handleInputChange(blankIndex, e.target.value)
                                    }
                                    onFocus={() => setActiveBlankIndex(blankIndex)}
                                    onKeyDown={(e) =>
                                      handleInputKeyDown(e, blankIndex)
                                    }
                                    placeholder={
                                      blank.definition
                                        ? `(${blank.definition})`
                                        : `(Từ ${blankIndex + 1})`
                                    }
                                    disabled={isEvaluated || isSavingSession}
                                    aria-label={`Ô trống ${blankIndex + 1}: ${blank.definition}`}
                                  />
                                )}

                                {/* Evaluation badge indicator */}
                                {isEvaluated && evalResult && (
                                  <span className="cloze-result-badge">
                                    {statusClass === 'is-correct' ? (
                                      <CheckCircle2 size={13} className="text-emerald-600" />
                                    ) : (
                                      <span
                                        className="cloze-correct-answer-hint"
                                        title={`Đáp án đúng: ${blank.term}`}
                                      >
                                        <XCircle size={13} className="text-rose-500" />
                                        <strong>{blank.term}</strong>
                                      </span>
                                    )}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </span>

                        {/* Sentence micro-actions */}
                        <span className="sentence-micro-actions">
                          <button
                            type="button"
                            className={`sentence-action-btn ${
                              isSentTransToggled ? 'is-active' : ''
                            }`}
                            onClick={() => handleToggleSentenceTranslation(sent.id)}
                            title="Bật/Tắt dịch câu này"
                          >
                            <Languages size={14} />
                          </button>
                          <button
                            type="button"
                            className={`sentence-action-btn ${
                              isSentPlaying ? 'is-playing' : ''
                            }`}
                            onClick={() => handleSpeakSentence(sent.text, sent.id)}
                            title="Nghe câu này"
                          >
                            <Volume2 size={14} />
                          </button>
                        </span>
                      </div>
                    )}

                    {/* Vietnamese translation line */}
                    {(displayMode === 'vi' || showSentTrans) && (
                      <div className="sentence-translation-row">
                        <span className="translation-text">
                          {sent.translation || paragraph.translation}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Vietnamese full paragraph translation box when toggled */}
            {isParagraphTransOpen && paragraph.translation && (
              <div className="paragraph-translation-full-box">
                <span className="translation-full-badge">🇻🇳 Bản dịch cả đoạn văn:</span>
                <p className="translation-full-text">{paragraph.translation}</p>
              </div>
            )}
          </div>
        );
      })}
      </div>

      {/* 8. EVALUATION SUMMARY CARD (when checked) */}
      {results && (
        <div className="story-evaluation-card">
          <div className="evaluation-summary-row">
            <div className="evaluation-score-text">
              Kết quả: <strong>{results.correctCount} / {results.total}</strong> từ chính xác ({results.percent}%)
            </div>

            <div
              className={`evaluation-score-badge ${
                results.percent >= 80 ? 'high' : results.percent >= 50 ? 'mid' : 'low'
              }`}
            >
              <Sparkles size={14} />
              <span>
                {results.percent === 100
                  ? 'Xuất sắc! Bạn ghi nhớ và hiểu sâu ngữ cảnh từ vựng.'
                  : results.percent >= 80
                  ? 'Rất tốt! Khả năng dùng từ theo ngữ cảnh rất chính xác.'
                  : 'Hãy xem lại các từ chưa đúng và luyện tập lại nhé!'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 9. BOTTOM ACTION FOOTER */}
      <div className="story-actions-footer">
        {results ? (
          <div className="footer-button-group">
            <button
              type="button"
              className="footer-btn-secondary"
              onClick={handleReset}
            >
              <span>Làm lại đoạn này</span>
            </button>
            <button
              type="button"
              className="footer-btn-primary"
              onClick={() => loadStory(true)}
            >
              <RotateCw size={15} />
              <span>Thử đoạn văn mới</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="footer-btn-primary full-action-btn"
            onClick={handleCheckAnswers}
            disabled={!story || isSavingSession}
          >
            <CheckCircle2 size={18} />
            <span>
              {isSavingSession ? 'Đang lưu kết quả...' : 'Kiểm tra đáp án'}
            </span>
          </button>
        )}
      </div>

      {/* 10. HISTORY MODAL */}
      {isHistoryModalOpen && (
        <div className="story-modal-overlay" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="story-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="story-modal-header">
              <div className="modal-title-with-icon">
                <Clock size={18} />
                <h3>Lịch sử làm bài</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsHistoryModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="story-modal-body">
              {historyList.length === 0 ? (
                <div className="empty-history-text">
                  Chưa có lượt làm bài nào. Hãy hoàn thành bài tập đầu tiên nhé!
                </div>
              ) : (
                <div className="history-entries-list">
                  {historyList.map((item) => (
                    <div key={item.id} className="history-entry-item">
                      <div className="history-item-left">
                        <span className="history-item-title">{item.title}</span>
                        <span className="history-item-date">{item.date}</span>
                      </div>
                      <div
                        className={`history-item-score ${
                          item.percent >= 80 ? 'high' : item.percent >= 50 ? 'mid' : 'low'
                        }`}
                      >
                        {item.score} ({item.percent}%)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="story-modal-footer">
              {historyList.length > 0 && (
                <button
                  type="button"
                  className="btn-clear-history"
                  onClick={() => {
                    setHistoryList([]);
                    localStorage.removeItem(historyStorageKey);
                  }}
                >
                  Xóa lịch sử
                </button>
              )}
              <button
                type="button"
                className="footer-btn-secondary"
                onClick={() => setIsHistoryModalOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. SETTINGS MODAL */}
      {isSettingsModalOpen && (
        <div className="story-modal-overlay" onClick={() => setIsSettingsModalOpen(false)}>
          <div className="story-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="story-modal-header">
              <div className="modal-title-with-icon">
                <Settings size={18} />
                <h3>Cài đặt bài học</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsSettingsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="story-modal-body settings-body">
              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-label">Tốc độ phát âm bài đọc</span>
                  <span className="setting-desc">Điều chỉnh tốc độ giọng đọc SpeechSynthesis</span>
                </div>
                <div className="setting-speed-options">
                  {PLAYBACK_SPEEDS.map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      className={`speed-option-btn ${playbackSpeed === sp ? 'is-selected' : ''}`}
                      onClick={() => setPlaybackSpeed(sp)}
                    >
                      {sp}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-label">Chế độ hiển thị mặc định</span>
                  <span className="setting-desc">Bản dịch song ngữ hoặc tiếng Anh thuần túy</span>
                </div>
                <div className="setting-mode-options">
                  {DISPLAY_MODES.map((dm) => (
                    <button
                      key={dm.id}
                      type="button"
                      className={`mode-option-btn ${displayMode === dm.id ? 'is-selected' : ''}`}
                      onClick={() => setDisplayMode(dm.id)}
                    >
                      {dm.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-info">
                  <span className="setting-label">Khóa Gemini AI cá nhân</span>
                  <span className="setting-desc">Tùy biến hoặc kiểm tra khóa API Gemini cá nhân</span>
                </div>
                <button
                  type="button"
                  className="btn-configure-key"
                  onClick={() => {
                    setIsSettingsModalOpen(false);
                    setIsKeyModalOpen(true);
                  }}
                >
                  <Key size={14} />
                  <span>Cài đặt API Key</span>
                </button>
              </div>
            </div>

            <div className="story-modal-footer">
              <button
                type="button"
                className="footer-btn-primary"
                onClick={() => setIsSettingsModalOpen(false)}
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. GEMINI KEY MODAL */}
      {isKeyModalOpen && (
        <GeminiKeyModal
          isOpen={isKeyModalOpen}
          onClose={() => setIsKeyModalOpen(false)}
          onSuccess={() => {
            setIsKeyModalOpen(false);
            loadStory(true);
          }}
        />
      )}
    </div>
  );
}
