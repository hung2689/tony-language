import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  GraduationCap,
  FileText,
  Headphones,
  Mic,
  MessageSquare,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { studyPlanService } from '../../services/studyPlanService';
import { studyService } from '../../services/studyService';
import SrsFlashcardReview from './SrsFlashcardReview';
import './SrsSessionPage.css';

export default function SrsSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeParams = useParams();

  const deckId = routeParams.deckId || searchParams.get('deckId') || null;

  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMode, setActiveMode] = useState('flashcard');
  const [isCompleted, setIsCompleted] = useState(false);

  const sessionIdRef = useRef(null);

  // Load queue data and initialize study session sequentially (BUG-06, BUG-14)
  useEffect(() => {
    let ignore = false;
    async function loadQueueAndSession() {
      setLoading(true);
      setError('');
      try {
        let res;
        if (deckId) {
          res = await studyPlanService.getDeckQueue(deckId);
        } else {
          res = await studyPlanService.getTodayQueue();
        }
        if (ignore) return;

        setQueueData(res || {});

        const cardsList = res?.cards || [];
        if (cardsList.length > 0) {
          try {
            const session = await studyService.createSession({
              deckId: deckId ? parseInt(deckId, 10) : null,
              direction: 'EN_TO_VI',
              plannedCount: cardsList.length,
              order: 'random',
            });
            if (!ignore && session?.id) {
              sessionIdRef.current = session.id;
            }
          } catch {
            // Safe fallback if session creation fails
          }
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Không thể tải danh sách từ cần ôn tập');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadQueueAndSession();
    return () => {
      ignore = true;
    };
  }, [deckId]);

  // Handle rating card (BUG-03: direct array payload)
  const handleRateCard = useCallback(
    async (vocabularyId, rating) => {
      const isCorrect = rating !== 'AGAIN';
      const sessionId = sessionIdRef.current;

      if (sessionId) {
        try {
          await studyService.recordAnswers(sessionId, [
            {
              clientAnswerId: `${Date.now()}-${vocabularyId}`,
              vocabularyId,
              direction: 'EN_TO_VI',
              result: isCorrect ? 'CORRECT' : 'WRONG',
              rating,
              override: false,
              userAnswer: rating,
              attemptNo: 1,
            },
          ]);
        } catch {
          // Keep session progressing smoothly even if offline/lag
        }
      }
    },
    []
  );

  // Handle completion
  const handleComplete = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (sessionId) {
      try {
        await studyService.finishSession(sessionId, { totalTimeSeconds: 60 });
      } catch {
        // Safe fallback
      }
    }
    setIsCompleted(true);
  }, []);

  const cards = queueData?.cards || [];
  const deckTitle = queueData?.planName || queueData?.name || (deckId ? 'Bộ từ vựng' : 'Lộ trình ôn tập');
  const totalCount = cards.length;
  const dueCount = queueData?.dueWords ?? queueData?.dueCount ?? totalCount;

  const modeTabs = [
    { id: 'flashcard', label: 'Flashcard', icon: Layers, available: true },
    { id: 'learn', label: 'Học', icon: GraduationCap, available: true },
    { id: 'test', label: 'Kiểm tra', icon: FileText, available: false },
    { id: 'dictation', label: 'Nghe Chép', icon: Headphones, available: false },
    { id: 'speaking', label: 'Speaking', icon: Mic, available: false },
    { id: 'conversation', label: 'Hội thoại', icon: MessageSquare, available: false },
    { id: 'grammar', label: 'Ngữ pháp', icon: BookOpen, available: false },
  ];

  return (
    <div className="srs-session-page">
      {/* Top Header */}
      <header className="srs-session-top-header">
        <div className="srs-session-header-left">
          <button
            type="button"
            className="srs-session-back-btn"
            onClick={() => navigate(deckId ? `/decks/${deckId}` : '/study-plan')}
            aria-label="Quay lại"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="srs-session-title-box">
            <h1 className="srs-session-title">Lặp lại ngắt quãng - {deckTitle}</h1>
            <p className="srs-session-subtitle">
              {totalCount} từ · Cần ôn tập: {dueCount}
            </p>
          </div>
        </div>
      </header>

      {/* Study Mode Selector Bar */}
      <nav className="srs-mode-bar-container" aria-label="Chế độ học">
        <div className="srs-mode-bar-grid">
          {modeTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMode === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                className={`srs-mode-tab-btn ${isActive ? 'is-active' : ''} ${
                  !tab.available ? 'is-disabled' : ''
                }`}
                onClick={() => {
                  if (tab.available) {
                    if (tab.id === 'learn') {
                      navigate(deckId ? `/decks/${deckId}/learn` : '/study-plan/learn');
                      return;
                    }
                    setActiveMode(tab.id);
                  }
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {!tab.available && <span className="srs-mode-soon-tag">Sớm</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Body */}
      <main className="srs-session-body">
        {loading ? (
          <div className="srs-complete-card">
            <div className="srs-forecast-spinner" />
            <p>Đang chuẩn bị phiên ôn tập lặp lại ngắt quãng...</p>
          </div>
        ) : error ? (
          <div className="srs-complete-card">
            <p style={{ color: '#ef4444' }}>{error}</p>
            <button
              type="button"
              className="srs-complete-btn"
              onClick={() => navigate('/')}
            >
              Về thư viện
            </button>
          </div>
        ) : isCompleted ? (
          <div className="srs-complete-card">
            <div className="srs-complete-icon">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="srs-complete-title">Hoàn thành phiên ôn tập!</h2>
            <p className="srs-complete-msg">
              Tất cả các từ đến hạn đã được cập nhật lại theo chu kỳ lặp lại ngắt quãng (SM-2). Trí nhớ của bạn đang được củng cố vững chắc.
            </p>
            <button
              type="button"
              className="srs-complete-btn"
              onClick={() => navigate(deckId ? `/decks/${deckId}` : '/study-plan')}
            >
              Tiếp tục học
            </button>
          </div>
        ) : cards.length === 0 ? (
          <div className="srs-complete-card">
            <div className="srs-complete-icon">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="srs-complete-title">Không có từ nào đến hạn</h2>
            <p className="srs-complete-msg">
              Tuyệt vời! Bạn đã hoàn thành tất cả các từ cần ôn tập trong thời điểm hiện tại.
            </p>
            <button
              type="button"
              className="srs-complete-btn"
              onClick={() => navigate('/')}
            >
              Về thư viện
            </button>
          </div>
        ) : activeMode === 'flashcard' ? (
          <SrsFlashcardReview
            cards={cards}
            onRateCard={handleRateCard}
            onComplete={handleComplete}
          />
        ) : null}
      </main>
    </div>
  );
}
