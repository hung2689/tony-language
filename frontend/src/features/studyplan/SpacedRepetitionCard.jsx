import { useNavigate } from 'react-router-dom';
import { useStudyPlan } from './StudyPlanContext';
import { Sparkles, Calendar, CheckCircle2, BookOpen, ArrowRight, Plus } from 'lucide-react';

export default function SpacedRepetitionCard({ onOpenCreateDeck, onOpenSrsForecast, totalDecksCount = 0 }) {
  const navigate = useNavigate();
  const { activePlan, todayQueue, loading, openCreateModal } = useStudyPlan();

  const handleActionClick = (e) => {
    e?.stopPropagation();
    if (onOpenSrsForecast) {
      onOpenSrsForecast();
    } else {
      navigate('/study-plan/srs');
    }
  };

  if (loading) {
    return (
      <div className="srs-action-card srs-action-card--loading" aria-busy="true">
        <div className="srs-card-skeleton" />
      </div>
    );
  }

  // Case 1: Empty library (0 decks) -> Guide to create first deck
  if (totalDecksCount === 0) {
    return (
      <div className="srs-action-card srs-action-card--empty">
        <div className="srs-card-icon-box">
          <BookOpen size={22} />
        </div>
        <div className="srs-card-body">
          <div className="srs-card-title-row">
            <h2 className="srs-card-title">Lặp lại ngắt quãng (Spaced Repetition)</h2>
            <span className="srs-pill-badge is-neutral">Chưa có dữ liệu</span>
          </div>
          <p className="srs-card-desc">
            Tạo bộ từ vựng đầu tiên để bắt đầu hành trình ôn tập khoa học với thuật toán SM-2, tự động tính toán thời điểm ôn tập tối ưu để chống quên lãng.
          </p>
        </div>
        <div className="srs-card-action">
          <button
            type="button"
            className="srs-cta-btn srs-cta-btn--primary"
            onClick={onOpenCreateDeck}
          >
            <Plus size={16} />
            <span>Tạo bộ từ vựng</span>
          </button>
        </div>
      </div>
    );
  }

  // Case 2: Active plan with words due today -> Direct review entry
  if (activePlan?.status === 'ACTIVE' && todayQueue && todayQueue.totalWords > 0) {
    const dueCount = todayQueue.dueWords || 0;
    const newCount = todayQueue.newWords || 0;
    const weakCount = todayQueue.weakWords || 0;

    return (
      <div
        className="srs-action-card srs-action-card--due"
        onClick={handleActionClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleActionClick(e)}
        title="Nhấp để xem dự báo và bắt đầu ôn tập lặp lại ngắt quãng"
      >
        <div className="srs-card-icon-box is-highlight">
          <Sparkles size={22} />
        </div>
        <div className="srs-card-body">
          <div className="srs-card-title-row">
            <h2 className="srs-card-title">Lặp lại ngắt quãng</h2>
            <span className="srs-pill-badge is-due">
              {todayQueue.totalWords} từ cần ôn hôm nay
            </span>
          </div>
          <div className="srs-card-desc">
            <span className="srs-desc-breakdown">
              {dueCount > 0 && <span className="srs-item-due">{dueCount} đến hạn ôn</span>}
              {dueCount > 0 && (weakCount > 0 || newCount > 0) && <span className="srs-dot">·</span>}
              {weakCount > 0 && <span className="srs-item-weak">{weakCount} cần củng cố</span>}
              {weakCount > 0 && newCount > 0 && <span className="srs-dot">·</span>}
              {newCount > 0 && <span className="srs-item-new">{newCount} từ mới</span>}
            </span>
            <span className="srs-desc-hint">Thuật toán SM-2 ưu tiên các từ sắp quên và từ cần củng cố.</span>
          </div>
        </div>
        <div className="srs-card-action">
          <button
            type="button"
            className="srs-cta-btn srs-cta-btn--primary"
            onClick={handleActionClick}
          >
            <span>Ôn tập ngay</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Case 3: Active plan and finished all words for today
  if (activePlan?.status === 'ACTIVE' && (!todayQueue || todayQueue.totalWords === 0)) {
    return (
      <div
        className="srs-action-card srs-action-card--done"
        onClick={handleActionClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleActionClick(e)}
        title="Xem dự báo và tiến độ ôn tập"
      >
        <div className="srs-card-icon-box is-success">
          <CheckCircle2 size={22} />
        </div>
        <div className="srs-card-body">
          <div className="srs-card-title-row">
            <h2 className="srs-card-title">Lặp lại ngắt quãng</h2>
            <span className="srs-pill-badge is-done">Đã hoàn thành hôm nay 🎉</span>
          </div>
          <p className="srs-card-desc">
            Bạn đã ôn tập hết các từ đến hạn hôm nay. Lần ôn tập tiếp theo sẽ được hệ thống tính toán và kích hoạt sau 4:00 AM ngày mai.
          </p>
        </div>
        <div className="srs-card-action">
          <button
            type="button"
            className="srs-cta-btn srs-cta-btn--secondary"
            onClick={handleActionClick}
          >
            <Calendar size={15} />
            <span>Xem dự báo 7 ngày</span>
          </button>
        </div>
      </div>
    );
  }

  // Case 4: No active plan yet or plan is paused -> Guide to start
  return (
    <div
      className="srs-action-card srs-action-card--setup"
      onClick={() => (activePlan ? navigate('/study-plan') : openCreateModal())}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && (activePlan ? navigate('/study-plan') : openCreateModal())}
      title={activePlan ? 'Xem lộ trình ôn tập' : 'Thiết lập lộ trình lặp lại ngắt quãng'}
    >
      <div className="srs-card-icon-box">
        <Calendar size={22} />
      </div>
      <div className="srs-card-body">
        <div className="srs-card-title-row">
          <h2 className="srs-card-title">Lặp lại ngắt quãng (Spaced Repetition)</h2>
          <span className="srs-pill-badge is-setup">Thuật toán SM-2</span>
        </div>
        <p className="srs-card-desc">
          {activePlan?.status === 'PAUSED'
            ? 'Lộ trình ôn tập đang tạm dừng. Nhấp để tiếp tục chu kỳ lặp lại ngắt quãng.'
            : 'Tự động tính toán khoảng cách ngày ôn tập theo mức độ ghi nhớ của từng từ vựng, giúp tối ưu hóa hiệu quả học tập.'}
        </p>
      </div>
      <div className="srs-card-action">
        <button
          type="button"
          className="srs-cta-btn srs-cta-btn--primary"
          onClick={(e) => {
            e.stopPropagation();
            if (activePlan) {
              navigate('/study-plan');
            } else {
              openCreateModal();
            }
          }}
        >
          <Sparkles size={15} />
          <span>{activePlan ? 'Xem lộ trình' : 'Bắt đầu ôn tập'}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
