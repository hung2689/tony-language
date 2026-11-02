import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { studyPlanService } from '../../services/studyPlanService';
import { studyService } from '../../services/studyService';
import { getModeRoute } from '../../utils/studyModeRegistry';
import StudyModeBar from '../decks/StudyModeBar';
import SrsFlashcardReview from './SrsFlashcardReview';
import Ripple from '../../components/common/Ripple';
import '../decks/DeckDetailPage.css';
import './SrsSessionPage.css';

export default function SrsSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeParams = useParams();

  const deckId = routeParams.deckId || searchParams.get('deckId') || null;

  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const sessionIdRef = useRef(null);

  // Scoped class on body for vintage pirate parchment theme
  useEffect(() => {
    document.body.classList.add('rpg-library-active');
    document.body.classList.add('deck-vintage-active');
    return () => {
      document.body.classList.remove('rpg-library-active');
      document.body.classList.remove('deck-vintage-active');
    };
  }, []);

  // Load queue data and initialize study session (unblocks UI as soon as cards arrive)
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
        // Unblock UI immediately so user sees flashcards right away
        setLoading(false);

        const cardsList = res?.cards || [];
        if (cardsList.length > 0) {
          // Initialize session in background without blocking the UI
          studyService.createSession({
            deckId: deckId ? parseInt(deckId, 10) : null,
            direction: 'EN_TO_VI',
            plannedCount: cardsList.length,
            order: 'random',
          }).then((session) => {
            if (!ignore && session?.id) {
              sessionIdRef.current = session.id;
            }
          }).catch(() => {
            // Safe fallback if session creation fails
          });
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Không thể tải danh sách từ cần ôn tập');
          setLoading(false);
        }
      }
    }

    loadQueueAndSession();
    return () => {
      ignore = true;
    };
  }, [deckId]);

  // Handle rating card
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
          // Keep session progressing smoothly even if network lags
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
  const rawTitle = queueData?.name || queueData?.deckName || queueData?.planName;
  const titleText = rawTitle
    ? rawTitle.toUpperCase()
    : (deckId ? `BỘ TỪ #${deckId}` : 'LẶP LẠI NGẮT QUÃNG — LỘ TRÌNH ÔN TẬP');

  const backUrl = deckId ? `/decks/${deckId}` : '/decks';

  return (
    <div className="deck-page-shell lexicon-journal-shell srs-vintage-shell">
      <div className="deck-page-main lexicon-journal-main">
        {/* Top Header Row with Vintage Pirate Navigation */}
        <header className="vintage-deck-header-row">
          {/* Left: Vintage Back Button */}
          <button
            type="button"
            className="vintage-header-back-btn"
            onClick={() => navigate(backUrl)}
            title="Quay lại"
            aria-label="Quay lại"
          >
            <img src="/assets/flashcard/button-back.png" alt="Quay lại" />
          </button>

          {/* Center: Classic Ornamental Book Title */}
          <div className="vintage-header-title-ribbon" title={titleText}>
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
              <h1 className="vintage-ribbon-text">{titleText}</h1>
            </div>
            <span className="vintage-title-flourish is-right" aria-hidden="true">
              <span className="flourish-dot">•</span>
              <span className="flourish-diamond">◆</span>
              <span className="flourish-line" />
            </span>
          </div>

          {/* Right: SRS Quick Button */}
          <div className="vintage-header-right-actions">
            <button
              type="button"
              className="vintage-header-srs-btn is-active"
              title="Chế độ lặp lại ngắt quãng (SM-2)"
              aria-label="Lặp lại ngắt quãng"
            >
              <img src="/assets/flashcard/button-srs.png" alt="Lặp lại ngắt quãng" />
            </button>
          </div>
        </header>

        {/* 3x2 Vintage Categories Grid */}
        <StudyModeBar
          deckId={deckId}
          activeModeId="flashcard"
          cardCount={cards.length}
          onSelectMode={(modeId) => {
            if (modeId === 'learn') {
              navigate(deckId ? `/decks/${deckId}/learn` : '/study-plan/learn');
            } else if (modeId === 'flashcard') {
              if (deckId) navigate(`/decks/${deckId}`);
            } else if (deckId) {
              navigate(getModeRoute(deckId, modeId));
            } else {
              navigate('/decks');
            }
          }}
        />

        {/* Main Content Area */}
        <main className="deck-detail-content" style={{ width: '100%' }}>
          {loading ? (
            <div className="deck-detail-state-screen">
              <Ripple size={48} color="#8A7152" />
              <p style={{ marginTop: '14px', color: '#5C4F3E', fontSize: '14px', fontFamily: 'Georgia, serif' }}>
                Đang lật mở trang nhật ký từ vựng...
              </p>
            </div>
          ) : error ? (
            <div className="deck-detail-state-screen">
              <div className="deck-state-icon-box warning">
                <AlertTriangle size={36} />
              </div>
              <h2 className="deck-state-title">Đã xảy ra lỗi</h2>
              <p className="deck-state-desc">{error}</p>
              <button
                type="button"
                className="monochrome-btn-primary"
                onClick={() => navigate(backUrl)}
              >
                <span>Quay lại</span>
              </button>
            </div>
          ) : isCompleted ? (
            <div className="vintage-srs-complete-card">
              <div className="vintage-srs-complete-icon-box">
                <img
                  src="/assets/decor_icon/decor_vocabulary_book.png"
                  alt=""
                  className="vintage-srs-complete-book"
                />
              </div>
              <h2 className="vintage-srs-complete-title">Hoàn thành phiên ôn tập!</h2>
              <p className="vintage-srs-complete-desc">
                Tất cả các từ đến hạn đã được cập nhật lại theo chu kỳ lặp lại ngắt quãng (SM-2). Trí nhớ của bạn đang được củng cố vững chắc.
              </p>
              <button
                type="button"
                className="monochrome-btn-primary"
                onClick={() => navigate(backUrl)}
              >
                <span>Tiếp tục hành trình</span>
              </button>
            </div>
          ) : cards.length === 0 ? (
            <div className="vintage-srs-complete-card">
              <div className="vintage-srs-complete-icon-box">
                <img
                  src="/assets/decor_icon/decor_vocabulary_book.png"
                  alt=""
                  className="vintage-srs-complete-book"
                />
              </div>
              <h2 className="vintage-srs-complete-title">Không có từ nào đến hạn</h2>
              <p className="vintage-srs-complete-desc">
                Tuyệt vời! Bạn đã hoàn thành tất cả các từ cần ôn tập trong thời điểm hiện tại.
              </p>
              <button
                type="button"
                className="monochrome-btn-primary"
                onClick={() => navigate(backUrl)}
              >
                <span>Về thư viện</span>
              </button>
            </div>
          ) : (
            <SrsFlashcardReview
              cards={cards}
              onRateCard={handleRateCard}
              onComplete={handleComplete}
            />
          )}
        </main>
      </div>
    </div>
  );
}
