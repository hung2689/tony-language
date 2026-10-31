import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, ArrowRight, X, Lock, Unlock } from 'lucide-react';
import { useStudyPlan } from './StudyPlanContext';
import { studyPlanService } from '../../services/studyPlanService';
import './StudyPlan.css';

export default function DailyGateReminder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activePlan, todayQueue, isGateDismissed, dismissGateToday, refreshPlan } = useStudyPlan();

  if (
    !activePlan ||
    activePlan.status !== 'ACTIVE' ||
    !todayQueue ||
    todayQueue.totalWords === 0 ||
    location.pathname.startsWith('/study-plan/learn') ||
    location.pathname.includes('/learn') ||
    location.pathname.startsWith('/decks/') ||
    location.pathname === '/study-plan' ||
    location.pathname.startsWith('/profile')
  ) {
    return null;
  }

  const handleStartToday = () => {
    navigate('/study-plan/learn');
  };

  const handleDisableHardGate = async () => {
    try {
      await studyPlanService.updatePlan({ hardGateEnabled: false });
      await refreshPlan();
    } catch (err) {
      console.error('Failed to disable hard gate', err);
    }
  };

  // 1. Hard Gate Blocker (Optional setting enabled by user)
  if (activePlan.hardGateEnabled) {
    return (
      <div className="hard-gate-blocker" role="dialog" aria-modal="true">
        <div className="hard-gate-card">
          <div className="hard-gate-icon-wrapper">
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#3B2B1C', fontFamily: "'Lora', serif" }}>
            Khóa Cổng Hải Trình
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#6E5336', margin: '0 0 1.5rem 0', lineHeight: 1.6, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
            Bạn đang bật tính năng <strong>Khóa tập trung</strong>. Hôm nay bạn còn{' '}
            <strong style={{ color: '#3B2B1C' }}>{todayQueue.totalWords} từ</strong> cần hoàn thành ({todayQueue.dueWords} từ đến hạn,{' '}
            {todayQueue.weakWords} từ yếu, {todayQueue.newWords} từ mới).
          </p>

          <button
            type="button"
            className="btn-start-today"
            style={{
              width: '100%',
              justifyContent: 'center',
              backgroundColor: '#46583A',
              color: '#FAF0DA',
              border: '1.5px solid #A8783E',
              borderRadius: '24px',
              padding: '11px 24px',
              fontWeight: 700,
              fontSize: '1rem',
              marginBottom: '0.75rem',
              boxShadow: '0 4px 12px rgba(59, 43, 28, 0.25)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onClick={handleStartToday}
          >
            <span>Bắt đầu ôn luyện hôm nay</span>
            <ArrowRight size={18} />
          </button>

          <button
            type="button"
            onClick={handleDisableHardGate}
            style={{
              background: 'none',
              border: 'none',
              color: '#796246',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem',
              textDecoration: 'underline',
            }}
          >
            <Unlock size={14} />
            <span>Tắt chế độ khóa cứng</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Soft Gate Banner (Default)
  if (isGateDismissed) {
    return null;
  }

  return (
    <div className="daily-gate-banner" role="status">
      <div className="daily-gate-banner-text">
        <div className="daily-gate-title">
          <Sparkles size={18} style={{ color: '#A8783E' }} />
          <span>Hôm nay bạn có {todayQueue.totalWords} từ cần học</span>
        </div>
        <div className="daily-gate-subtitle">
          {todayQueue.dueWords > 0 && `${todayQueue.dueWords} ôn tập • `}
          {todayQueue.weakWords > 0 && `${todayQueue.weakWords} cần củng cố • `}
          {todayQueue.newWords > 0 && `${todayQueue.newWords} từ mới`}
        </div>
      </div>

      <div className="daily-gate-actions">
        <button
          type="button"
          onClick={handleStartToday}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            backgroundColor: '#46583A',
            color: '#FAF0DA',
            border: '1.5px solid #A8783E',
            borderRadius: '20px',
            padding: '0.45rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(59, 43, 28, 0.2)',
          }}
        >
          <span>Học ngay</span>
          <ArrowRight size={14} />
        </button>

        <button
          type="button"
          onClick={dismissGateToday}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            padding: '0.375rem',
            borderRadius: '0.375rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Để sau"
          aria-label="Để sau"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
