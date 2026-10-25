import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLearnSession } from '../learn/useLearnSession';
import LearnSetup from '../learn/LearnSetup';
import LearnQuestion from '../learn/LearnQuestion';
import LearnFeedback from '../learn/LearnFeedback';
import LearnResults from '../learn/LearnResults';
import LearnSettingsPopover from '../learn/LearnSettingsPopover';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Button from '../../components/common/Button';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import '../learn/Learn.css';
import './Analytics.css';

export default function WeakWordsPracticePage() {
  const navigate = useNavigate();

  const [cards] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('weak_practice_cards') || '[]');
    } catch {
      return [];
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  const deckDescriptor = useMemo(() => ({
    id: null,
    name: 'Ôn tập từ yếu & Củng cố trí nhớ',
  }), []);

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
      navigate('/analytics');
    }
  };

  const handleConfirmExit = async () => {
    setIsExitConfirmOpen(false);
    await flushOnExit();
    navigate('/analytics');
  };

  if (cards.length === 0) {
    return (
      <div className="learn-distraction-free-container">
        <div className="learn-center-state">
          <CheckCircle size={56} color="#10b981" />
          <h2 className="learn-state-title">Không có từ yếu cần ôn tập!</h2>
          <p className="learn-state-msg">
            Hiện tại danh sách từ yếu của bạn đang trống. Hãy tiếp tục duy trì phong độ nhé!
          </p>
          <div className="learn-state-actions">
            <Button variant="primary" onClick={() => navigate('/analytics')}>
              <ArrowLeft size={16} /> Quay lại trang Thống kê
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
          onExit={() => navigate('/analytics')}
        />
      )}

      {/* Exit Dialog */}
      <ConfirmDialog
        isOpen={isExitConfirmOpen}
        title="Dừng phiên ôn tập?"
        message="Các câu trả lời của bạn đã được ghi nhận tự động vào hệ thống."
        confirmText="Lưu & Thoát"
        cancelText="Tiếp tục học"
        onConfirm={handleConfirmExit}
        onCancel={() => setIsExitConfirmOpen(false)}
      />
    </div>
  );
}
