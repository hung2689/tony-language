import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudyPlan } from './StudyPlanContext';
import { studyPlanService } from '../../services/studyPlanService';
import { useLearnSession } from '../learn/useLearnSession';
import LearnSetup from '../learn/LearnSetup';
import LearnQuestion from '../learn/LearnQuestion';
import LearnFeedback from '../learn/LearnFeedback';
import LearnResults from '../learn/LearnResults';
import LearnSettingsPopover from '../learn/LearnSettingsPopover';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Button from '../../components/common/Button';
import Ripple from '../../components/common/Ripple';
import { AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import '../learn/Learn.css';
import './StudyPlan.css';

export default function TodayLearnPage() {
  const navigate = useNavigate();
  const { activePlan, refreshPlan } = useStudyPlan();

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  // Load today's queue
  useEffect(() => {
    let ignore = false;
    async function loadQueue() {
      try {
        const res = await studyPlanService.getTodayQueue();
        if (!ignore) {
          const data = res || {};
          setCards(data.cards || []);
        }
      } catch (err) {
        if (!ignore) {
          setErrorMessage(err.message || 'Không thể tải danh sách từ cần học hôm nay.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadQueue();
    return () => {
      ignore = true;
    };
  }, []);

  const deckDescriptor = useMemo(() => ({
    id: activePlan?.id || null,
    name: activePlan ? `${activePlan.name} • Học hôm nay` : 'Học hôm nay',
  }), [activePlan?.id, activePlan?.name]);

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
  } = useLearnSession(deckDescriptor, cards);

  const handleExitRequest = () => {
    const isMidSession = state.status === 'question' || state.status === 'feedback';
    const hasAnswers = (state.sessionStats?.totalAttempts || 0) > 0;

    if (isMidSession && hasAnswers) {
      setIsExitConfirmOpen(true);
    } else {
      navigate('/study-plan');
    }
  };

  const handleConfirmExit = async () => {
    setIsExitConfirmOpen(false);
    await flushOnExit();
    await refreshPlan();
    navigate('/');
  };

  // When session completes, refresh plan data
  useEffect(() => {
    if (state.status === 'results') {
      refreshPlan();
    }
  }, [state.status, refreshPlan]);

  if (loading) {
    return (
      <div className="learn-distraction-free-container">
        <div className="learn-center-state">
          <Ripple size={56} color="#3b82f6" style={{ margin: '0 auto 16px auto' }} />
          <h2 className="learn-state-title">Đang chuẩn bị phiên học hôm nay...</h2>
          <p className="learn-state-msg">Thuật toán SM-2 đang tối ưu danh sách từ cần ôn tập.</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="learn-distraction-free-container">
        <div className="learn-center-state">
          <AlertTriangle size={48} color="#f59e0b" />
          <h2 className="learn-state-title">Chưa có dữ liệu ôn tập hôm nay</h2>
          <p className="learn-state-msg">
            {errorMessage.includes('Chưa có lộ trình')
              ? 'Bạn chưa kích hoạt lộ trình lặp lại ngắt quãng. Hãy thiết lập lộ trình từ danh sách bộ từ vựng để bắt đầu.'
              : errorMessage}
          </p>
          <div className="learn-state-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button variant="primary" onClick={() => navigate('/')}>
              <ArrowLeft size={16} /> Về danh sách bộ từ
            </Button>
            <Button variant="secondary" onClick={() => navigate('/study-plan')}>
              Xem lộ trình
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="learn-distraction-free-container">
        <div className="learn-center-state">
          <CheckCircle size={56} color="#10b981" />
          <h2 className="learn-state-title">Mục tiêu hôm nay đã hoàn thành!</h2>
          <p className="learn-state-msg">
            Không còn từ nào đến hạn ôn tập trong ngày hôm nay. Lần ôn tập tiếp theo sẽ bắt đầu sau 4:00 AM ngày mai.
          </p>
          <div className="learn-state-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button variant="primary" onClick={() => navigate('/')}>
              <ArrowLeft size={16} /> Về danh sách bộ từ
            </Button>
            <Button variant="secondary" onClick={() => navigate('/study-plan')}>
              Xem lộ trình ôn tập
            </Button>
          </div>
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

      {/* 1. Setup screen */}
      {state.status === 'setup' && (
        <LearnSetup
          deck={deckDescriptor}
          cards={cards}
          options={state.options}
          onOptionsChange={updateOptions}
          onStartSession={startSession}
          onExit={handleExitRequest}
        />
      )}

      {/* 2. Question screen */}
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

      {/* 3. Feedback screen */}
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

      {/* 4. Results screen */}
      {state.status === 'results' && (
        <LearnResults
          deck={deckDescriptor}
          items={state.items}
          stats={state.stats}
          cardStats={state.cardStats}
          sessionStats={state.sessionStats}
          onRetryMissed={retryMissed}
          onRetryAll={retryAll}
          onExit={() => {
            refreshPlan();
            navigate('/study-plan');
          }}
        />
      )}

      {/* Exit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isExitConfirmOpen}
        title="Tạm dừng phiên học hôm nay?"
        message="Tiến độ và các câu trả lời bạn vừa làm đã được ghi nhận tự động vào hệ thống SM-2. Bạn có thể quay lại học tiếp bất cứ lúc nào."
        confirmText="Lưu & Thoát"
        cancelText="Tiếp tục học"
        onConfirm={handleConfirmExit}
        onCancel={() => setIsExitConfirmOpen(false)}
      />
    </div>
  );
}
