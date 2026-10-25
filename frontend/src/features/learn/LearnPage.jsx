import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deckService } from '../../services/deckService';
import { useLearnSession } from './useLearnSession';
import LearnSetup from './LearnSetup';
import LearnQuestion from './LearnQuestion';
import LearnFeedback from './LearnFeedback';
import LearnResults from './LearnResults';
import LearnSettingsPopover from './LearnSettingsPopover';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Button from '../../components/common/Button';
import { AlertTriangle, FolderX, RefreshCw, ArrowLeft, Plus } from 'lucide-react';
import './Learn.css';

export default function LearnPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();

  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null); // null | 404 | 500
  const [errorMessage, setErrorMessage] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  // Load deck details on mount or deckId change
  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const data = await deckService.getDeck(deckId);
        if (!ignore) {
          setDeck(data);
          setCards(data?.cards || data?.vocabularies || []);
        }
      } catch (err) {
        if (!ignore) {
          if (err.status === 404 || err.message?.includes('404') || err.message?.includes('Không tìm thấy')) {
            setErrorStatus(404);
          } else {
            setErrorStatus(err.status || 500);
          }
          setErrorMessage(err.message || 'Không thể tải bộ từ vựng.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [deckId]);

  const loadDeck = useCallback(async () => {
    setLoading(true);
    setErrorStatus(null);
    setErrorMessage('');
    try {
      const data = await deckService.getDeck(deckId);
      setDeck(data);
      setCards(data?.cards || data?.vocabularies || []);
    } catch (err) {
      if (err.status === 404 || err.message?.includes('404') || err.message?.includes('Không tìm thấy')) {
        setErrorStatus(404);
      } else {
        setErrorStatus(err.status || 500);
      }
      setErrorMessage(err.message || 'Không thể tải bộ từ vựng.');
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  const {
    state,
    updateOptions,
    startSession,
    submitAnswer,
    skipQuestion,
    overrideAnswer,
    nextQuestion,
    retryMissed,
    retryAll,
    flushOnExit,
  } = useLearnSession(deck, cards);

  // Exit navigation with confirmation if session is active and answers exist
  const handleExitRequest = () => {
    const isMidSession = state.status === 'question' || state.status === 'feedback';
    const hasAnswers = (state.sessionStats?.totalAttempts || 0) > 0;

    if (isMidSession && hasAnswers) {
      setIsExitConfirmOpen(true);
    } else {
      navigate(`/decks/${deckId}`);
    }
  };

  const handleConfirmExit = async () => {
    setIsExitConfirmOpen(false);
    await flushOnExit();
    navigate(`/decks/${deckId}`);
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="learn-distraction-free-container">
        <div className="learn-center-state">
          <div className="learn-spinner" aria-label="Đang tải..." />
          <p className="learn-state-msg">Đang chuẩn bị bộ từ vựng...</p>
        </div>
      </div>
    );
  }

  // 2. 404 / Not Owned State
  if (errorStatus === 404) {
    return (
      <div className="learn-distraction-free-container">
        <div className="learn-center-state">
          <FolderX size={56} className="text-secondary" />
          <h2 className="learn-state-title">Không tìm thấy bộ từ</h2>
          <p className="learn-state-msg">
            Bộ từ này không tồn tại hoặc bạn không có quyền truy cập.
          </p>
          <Button variant="primary" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
            <span>Về thư viện của tôi</span>
          </Button>
        </div>
      </div>
    );
  }

  // 3. Error State
  if (errorStatus) {
    return (
      <div className="learn-distraction-free-container">
        <div className="learn-center-state">
          <AlertTriangle size={56} className="text-danger" />
          <h2 className="learn-state-title">Đã xảy ra lỗi</h2>
          <p className="learn-state-msg">{errorMessage}</p>
          <div className="learn-state-actions">
            <Button variant="primary" onClick={loadDeck}>
              <RefreshCw size={16} />
              <span>Thử lại</span>
            </Button>
            <Button variant="secondary" onClick={() => navigate('/')}>
              <span>Về thư viện</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Empty Deck State
  if (cards.length === 0) {
    return (
      <div className="learn-distraction-free-container">
        <div className="learn-center-state">
          <FolderX size={56} className="text-secondary" />
          <h2 className="learn-state-title">Bộ từ chưa có thẻ nào</h2>
          <p className="learn-state-msg">
            Hãy thêm thẻ từ vựng vào bộ từ này trước khi bắt đầu luyện tập.
          </p>
          <Button variant="primary" onClick={() => navigate(`/decks/${deckId}`)}>
            <Plus size={16} />
            <span>Thêm thẻ từ vựng</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="learn-distraction-free-container">
      {/* Settings Popover */}
      <LearnSettingsPopover
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        options={state.options}
        onOptionsChange={updateOptions}
      />

      {/* State Machine Views */}
      {state.status === 'setup' && (
        <LearnSetup
          deck={deck}
          cards={cards}
          options={state.options}
          onOptionsChange={updateOptions}
          onStartSession={startSession}
          onExit={() => navigate(`/decks/${deckId}`)}
        />
      )}

      {state.status === 'question' && state.currentQuestion && (
        <LearnQuestion
          currentQuestion={state.currentQuestion}
          sessionStats={state.sessionStats}
          distinctCardCount={state.distinctCardIdsShown?.length ?? 1}
          nudge={state.nudge}
          options={state.options}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSubmitAnswer={submitAnswer}
          onSkipQuestion={skipQuestion}
          onExit={handleExitRequest}
        />
      )}

      {state.status === 'feedback' && state.feedback && state.currentQuestion && (
        <LearnFeedback
          feedback={state.feedback}
          currentQuestion={state.currentQuestion}
          sessionStats={state.sessionStats}
          distinctCardCount={state.distinctCardIdsShown?.length ?? 1}
          options={state.options}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onNextQuestion={nextQuestion}
          onOverride={overrideAnswer}
          onExit={handleExitRequest}
        />
      )}

      {state.status === 'results' && (
        <LearnResults
          deck={deck}
          items={state.items}
          stats={state.stats}
          cardStats={state.cardStats}
          sessionStats={state.sessionStats}
          onRetryMissed={retryMissed}
          onRetryAll={retryAll}
          onExit={() => navigate(`/decks/${deckId}`)}
        />
      )}

      {/* Exit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isExitConfirmOpen}
        onClose={() => setIsExitConfirmOpen(false)}
        onConfirm={handleConfirmExit}
        title="Thoát phiên học?"
        message="Tiến độ học tập của bạn sẽ được lưu lại nếu bạn chọn thoát."
        confirmText="Lưu và Thoát"
        cancelText="Tiếp tục học"
        confirmVariant="primary"
      />
    </div>
  );
}
