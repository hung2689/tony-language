import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  BookOpen,
  Pause,
  Play,
  Settings,
  CheckCircle2,
} from 'lucide-react';
import { useStudyPlan } from './StudyPlanContext';
import { studyPlanService } from '../../services/studyPlanService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Ripple from '../../components/common/Ripple';
import './StudyPlan.css';

export default function StudyPlanPage() {
  const navigate = useNavigate();
  const {
    activePlan,
    todayQueue,
    loading,
    refreshPlan,
    openCreateModal,
    openAddDecksModal,
  } = useStudyPlan();

  const [deckToRemove, setDeckToRemove] = useState(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings form states
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editMaxNewWords, setEditMaxNewWords] = useState(50);
  const [editHardGate, setEditHardGate] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  if (loading && !activePlan) {
    return (
      <div className="study-plan-page">
        <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-secondary, #6b7280)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <Ripple size={48} color="#3b82f6" />
          <span>Đang tải thông tin lộ trình...</span>
        </div>
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="study-plan-page">
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '1rem',
            padding: '3rem 2rem',
            textAlign: 'center',
            maxWidth: '560px',
            margin: '2rem auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#f4f4f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#18181b',
            }}
          >
            <BookOpen size={30} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#111827' }}>
            Chưa có lộ trình ôn tập nào
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
            Thiết lập lộ trình ôn tập thông minh bằng thuật toán lặp lại ngắt quãng (SM-2).
            Hệ thống sẽ tự động phân bổ từ cần học mỗi ngày theo hạn chót của bạn.
          </p>
          <button
            type="button"
            className="btn-start-today"
            style={{ backgroundColor: '#18181b', color: '#ffffff', marginTop: '0.5rem' }}
            onClick={() => openCreateModal()}
          >
            <Plus size={18} />
            <span>Tạo lộ trình ngay</span>
          </button>
        </div>
      </div>
    );
  }

  const handleTogglePause = async () => {
    try {
      const newStatus = activePlan.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      await studyPlanService.updatePlan({ status: newStatus });
      await refreshPlan();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const handleOpenSettings = () => {
    setEditTargetDate(activePlan.targetDate || '');
    setEditMaxNewWords(activePlan.maxNewWordsPerDay || 50);
    setEditHardGate(Boolean(activePlan.hardGateEnabled));
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await studyPlanService.updatePlan({
        targetDate: editTargetDate,
        maxNewWordsPerDay: Number(editMaxNewWords),
        hardGateEnabled: editHardGate,
      });
      await refreshPlan();
      setIsSettingsOpen(false);
    } catch (err) {
      console.error('Failed to update plan settings', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleConfirmRemoveDeck = async () => {
    if (!deckToRemove) return;
    try {
      await studyPlanService.removeDeckFromPlan(deckToRemove.id);
      await refreshPlan();
    } catch (err) {
      console.error('Failed to remove deck', err);
    } finally {
      setDeckToRemove(null);
    }
  };

  const handleConfirmDeletePlan = async () => {
    try {
      await studyPlanService.deleteActivePlan();
      await refreshPlan();
    } catch (err) {
      console.error('Failed to delete plan', err);
    } finally {
      setIsDeletingPlan(false);
    }
  };

  const totalWords = activePlan.totalWords || 0;
  const masteredWords = activePlan.masteredWords || 0;
  const learningWords = activePlan.learningWords || 0;
  const progressPercent = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;
  const daysRemaining = activePlan.daysRemaining || 0;

  return (
    <div className="study-plan-page">
      {/* 1. Header */}
      <div className="study-plan-header">
        <div className="study-plan-title-group">
          <h1>
            <span>{activePlan.name}</span>
            <span
              className={`study-plan-badge ${
                activePlan.status === 'ACTIVE' ? 'study-plan-badge-active' : 'study-plan-badge-paused'
              }`}
            >
              {activePlan.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
            </span>
          </h1>
          <p className="study-plan-subtitle">
            Hạn chót: <strong>{activePlan.targetDate}</strong> ({daysRemaining > 0 ? `Còn ${daysRemaining} ngày` : 'Đã đến hạn'})
            {' • '}Mục tiêu: {activePlan.maxNewWordsPerDay} từ mới/ngày
            {activePlan.hardGateEnabled && ' • Khóa tập trung'}
          </p>
        </div>

        <div className="study-plan-header-actions">
          <button
            type="button"
            className="btn-plan-secondary"
            onClick={handleTogglePause}
          >
            {activePlan.status === 'ACTIVE' ? <Pause size={15} /> : <Play size={15} />}
            <span>{activePlan.status === 'ACTIVE' ? 'Tạm dừng' : 'Tiếp tục'}</span>
          </button>

          <button
            type="button"
            className="btn-plan-secondary"
            onClick={handleOpenSettings}
          >
            <Settings size={15} />
            <span>Cài đặt</span>
          </button>

          <button
            type="button"
            className="btn-plan-danger"
            onClick={() => setIsDeletingPlan(true)}
          >
            <Trash2 size={15} />
            <span>Xóa lộ trình</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Card: Học hôm nay with Circular Target Progress Gauge */}
      <div className="study-plan-hero-card">
        {/* Left Side: Circular Gauge */}
        <div className="study-plan-hero-gauge-box">
          <svg viewBox="0 0 100 100" width="72" height="72" className="hero-gauge-svg">
            <circle
              cx="50"
              cy="50"
              r="40"
              strokeWidth="8"
              fill="none"
              className="hero-gauge-bg"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              strokeWidth="8"
              fill="none"
              className={`hero-gauge-progress ${(!todayQueue || todayQueue.totalWords === 0) ? 'is-complete' : ''}`}
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={
                (!todayQueue || todayQueue.totalWords === 0)
                  ? 0
                  : 2 * Math.PI * 40 * Math.min(0.9, Math.max(0.15, (todayQueue.totalWords || 0) / (activePlan.maxNewWordsPerDay || 30)))
              }
              strokeLinecap="round"
            />
          </svg>
          <div className="hero-gauge-center">
            {(!todayQueue || todayQueue.totalWords === 0) ? (
              <CheckCircle2 size={20} className="hero-gauge-done-icon" />
            ) : (
              <>
                <span className="hero-gauge-num">{todayQueue.totalWords}</span>
                <span className="hero-gauge-unit">từ</span>
              </>
            )}
          </div>
        </div>

        <div className="study-plan-hero-content">
          <div className="study-plan-hero-tag">
            <Sparkles size={14} />
            <span>Phiên học hôm nay</span>
          </div>

          {todayQueue && todayQueue.totalWords > 0 ? (
            <>
              <h2 className="study-plan-hero-title">
                Hôm nay bạn có {todayQueue.totalWords} từ cần ôn tập
              </h2>
              <div className="study-plan-breakdown-pills">
                {todayQueue.dueWords > 0 && (
                  <span className="breakdown-pill">
                    <strong>{todayQueue.dueWords}</strong> Đến hạn ôn
                  </span>
                )}
                {todayQueue.weakWords > 0 && (
                  <span className="breakdown-pill">
                    <strong>{todayQueue.weakWords}</strong> Cần củng cố
                  </span>
                )}
                {todayQueue.newWords > 0 && (
                  <span className="breakdown-pill">
                    <strong>{todayQueue.newWords}</strong> Từ mới
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="study-plan-hero-title">
                Bạn đã hoàn thành mục tiêu hôm nay!
              </h2>
              <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.9rem' }}>
                Tuyệt vời! Thuật toán SM-2 sẽ chuẩn bị danh sách từ ôn tập tiếp theo vào lúc 4:00 AM ngày mai.
              </p>
            </>
          )}
        </div>

        <div className="study-plan-hero-action">
          <button
            type="button"
            className="btn-start-today"
            disabled={!todayQueue || todayQueue.totalWords === 0 || activePlan.status !== 'ACTIVE'}
            onClick={() => navigate('/study-plan/learn')}
          >
            <span>{todayQueue && todayQueue.totalWords > 0 ? 'Bắt đầu học ngay' : 'Đã xong hôm nay'}</span>
            <ArrowRight size={18} />
          </button>
          {activePlan.status === 'PAUSED' && (
            <span style={{ fontSize: '0.75rem', color: '#fca5a5' }}>
              Lộ trình đang tạm dừng. Hãy bấm Tiếp tục để học.
            </span>
          )}
        </div>
      </div>

      {/* 3. Main 2-Column Layout: Left (~65%) for Progress + Decks, Right (~35%) for Sticky 2x2 Stats */}
      <div className="study-plan-main-grid">
        {/* Left Column: Progress Overview & Enrolled Decks */}
        <div className="study-plan-left-column">
          {/* Progress Overview Card */}
          <div className="study-plan-progress-container">
            <div className="progress-header">
              <span>Tiến độ tổng thể</span>
              <span>{masteredWords} / {totalWords} từ ({progressPercent}%)</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Enrolled Decks Section */}
          <div className="study-plan-section">
            <div className="section-header">
              <h3 className="section-title">
                <BookOpen size={18} />
                <span>Các bộ từ trong lộ trình ({activePlan.decks?.length || 0})</span>
              </h3>
              <button
                type="button"
                className="btn-add-deck-primary"
                onClick={() => openAddDecksModal()}
              >
                <Plus size={15} />
                <span>Thêm bộ từ</span>
              </button>
            </div>

            {(!activePlan.decks || activePlan.decks.length === 0) ? (
              <div className="enrolled-decks-empty">
                <div className="empty-deck-icon-wrap">
                  <BookOpen size={20} />
                </div>
                <p className="empty-deck-text">Chưa có bộ từ nào trong lộ trình</p>
                <button
                  type="button"
                  className="btn-add-deck-compact"
                  onClick={() => openAddDecksModal()}
                >
                  <Plus size={14} />
                  <span>Thêm bộ từ</span>
                </button>
              </div>
            ) : (
              <table className="enrolled-decks-table">
                <thead>
                  <tr>
                    <th>Tên bộ từ</th>
                    <th>Số lượng thẻ</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {activePlan.decks.map((deck) => (
                    <tr key={deck.id}>
                      <td style={{ fontWeight: 500 }}>{deck.name}</td>
                      <td>{deck.cardCount ?? 0} thẻ</td>
                      <td>
                        <button
                          type="button"
                          className="btn-remove-deck"
                          onClick={() => setDeckToRemove(deck)}
                        >
                          <Trash2 size={13} />
                          <span>Xóa</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: 4 Stats Cards in 2x2 Grid (Sticky) */}
        <div className="study-plan-right-column">
          <div className="study-plan-stats-grid-sticky">
            <div className="stat-box">
              <span className="stat-box-label">Tổng số từ trong lộ trình</span>
              <span className="stat-box-value">{totalWords}</span>
              <span className="stat-box-meta">{activePlan.decks?.length || 0} bộ từ vựng</span>
            </div>

            <div className="stat-box">
              <span className="stat-box-label">Từ đã thành thạo</span>
              <span className="stat-box-value stat-val-mastered">{masteredWords}</span>
              <span className="stat-box-meta">Khoảng cách ôn &gt; 21 ngày</span>
            </div>

            <div className="stat-box">
              <span className="stat-box-label">Từ đang ghi nhớ</span>
              <span className="stat-box-value stat-val-learning">{learningWords}</span>
              <span className="stat-box-meta">Trong chu kỳ lặp lại SM-2</span>
            </div>

            <div className="stat-box">
              <span className="stat-box-label">Thời gian còn lại</span>
              <span className="stat-box-value">{daysRemaining} ngày</span>
              <span className="stat-box-meta">Kết thúc: {activePlan.targetDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="study-plan-modal-backdrop" onClick={() => setIsSettingsOpen(false)} role="dialog">
          <div className="study-plan-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="study-plan-modal-header">
              <h2 className="study-plan-modal-title">Cài đặt lộ trình</h2>
            </div>
            <form onSubmit={handleSaveSettings}>
              <div className="study-plan-modal-body">
                <div>
                  <label htmlFor="edit-target-date" className="plan-modal-label">
                    Ngày hoàn thành (Deadline)
                  </label>
                  <input
                    id="edit-target-date"
                    type="date"
                    className="plan-modal-input"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit-max-words" className="plan-modal-label">
                    Số từ mới tối đa mỗi ngày
                  </label>
                  <input
                    id="edit-max-words"
                    type="number"
                    min="5"
                    max="200"
                    className="plan-modal-input"
                    value={editMaxNewWords}
                    onChange={(e) => setEditMaxNewWords(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="plan-modal-checkbox-label">
                    <input
                      type="checkbox"
                      checked={editHardGate}
                      onChange={(e) => setEditHardGate(e.target.checked)}
                    />
                    <span>Bật chế độ Khóa tập trung (&quot;Khóa tôi cho đến khi học xong&quot;)</span>
                  </label>
                  <p className="plan-modal-checkbox-help">
                    Mặc định là thông báo mềm. Khi bật tùy chọn này, màn hình sẽ bị khóa cho đến khi bạn hoàn thành các từ cần học hôm nay.
                  </p>
                </div>
              </div>

              <div className="study-plan-modal-footer">
                <button
                  type="button"
                  className="plan-modal-btn-cancel"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="plan-modal-btn-submit"
                  disabled={savingSettings}
                >
                  {savingSettings ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm remove deck dialog */}
      <ConfirmDialog
        isOpen={Boolean(deckToRemove)}
        title="Xóa bộ từ khỏi lộ trình?"
        message={`Bạn có chắc muốn xóa bộ từ "${deckToRemove?.name}" khỏi lộ trình ôn tập này? Lịch sử tiến độ của các từ vựng vẫn sẽ được giữ nguyên.`}
        confirmText="Xóa khỏi lộ trình"
        onConfirm={handleConfirmRemoveDeck}
        onCancel={() => setDeckToRemove(null)}
      />

      {/* Confirm delete plan dialog */}
      <ConfirmDialog
        isOpen={isDeletingPlan}
        title="Xóa lộ trình ôn tập?"
        message="Bạn có chắc chắn muốn xóa lộ trình này? Toàn bộ thiết lập lộ trình sẽ bị hủy, tuy nhiên dữ liệu tiến độ SM-2 của từng từ vựng vẫn được lưu giữ."
        confirmText="Xác nhận xóa"
        confirmVariant="danger"
        onConfirm={handleConfirmDeletePlan}
        onCancel={() => setIsDeletingPlan(false)}
      />
    </div>
  );
}
