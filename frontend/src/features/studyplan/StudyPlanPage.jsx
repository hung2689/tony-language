import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  BookOpen,
  Pause,
  Play,
  Settings,
  CheckCircle2,
  CheckSquare,
  X,
  MoreHorizontal,
} from 'lucide-react';
import { useStudyPlan } from './StudyPlanContext';
import { studyPlanService } from '../../services/studyPlanService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Ripple from '../../components/common/Ripple';
import './StudyPlan.css';

const BULK_CONFIRM_THRESHOLD = 5;

export default function StudyPlanPage() {
  const navigate = useNavigate();
  const {
    activePlan,
    todayQueue,
    loading,
    isMutatingDecks,
    refreshPlan,
    removeDecks,
    updatePlanSettings,
    openCreateModal,
    openAddDecksModal,
  } = useStudyPlan();

  // Selection mode states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedDeckIds, setSelectedDeckIds] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const lastClickedIndexRef = useRef(null);
  const selectAllCheckboxRef = useRef(null);

  // Confirmation modal state for >= 5 decks or removing all decks
  const [pendingConfirmDecks, setPendingConfirmDecks] = useState(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings form states
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editMaxNewWords, setEditMaxNewWords] = useState(50);
  const [editHardGate, setEditHardGate] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Scoped class on body: hides modern wallpaper and floating dock, applies authentic parchment background
  useEffect(() => {
    document.body.classList.add('rpg-library-active');
    document.body.classList.add('study-plan-vintage-active');
    return () => {
      document.body.classList.remove('rpg-library-active');
      document.body.classList.remove('study-plan-vintage-active');
    };
  }, []);

  const enrolledDecks = useMemo(() => activePlan?.decks || [], [activePlan?.decks]);

  // Automatically prune non-existent deck IDs from selectedDeckIds whenever enrolledDecks changes
  useEffect(() => {
    const validIds = new Set(enrolledDecks.map((d) => d.id));
    setSelectedDeckIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
    if (enrolledDecks.length === 0 && isSelectionMode) {
      setIsSelectionMode(false);
    }
  }, [enrolledDecks, isSelectionMode]);

  const selectedIdSet = useMemo(() => new Set(selectedDeckIds), [selectedDeckIds]);
  const allSelected = enrolledDecks.length > 0 && selectedDeckIds.length === enrolledDecks.length;
  const someSelected = selectedDeckIds.length > 0 && selectedDeckIds.length < enrolledDecks.length;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const selectedTotalCards = useMemo(() => {
    return enrolledDecks
      .filter((d) => selectedIdSet.has(d.id))
      .reduce((sum, d) => sum + (d.cardCount ?? 0), 0);
  }, [enrolledDecks, selectedIdSet]);

  if (loading && !activePlan) {
    return (
      <div className="study-plan-page">
        <div className="study-plan-loading-state">
          <Ripple size={48} color="#C49856" />
          <span>Đang mở bản đồ hải trình ôn tập...</span>
        </div>
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="study-plan-page">
        <div className="study-plan-empty-card">
          <div className="study-plan-empty-icon-wrap">
            <BookOpen size={32} />
          </div>
          <h2 className="study-plan-empty-title">Chưa có hải trình ôn tập nào</h2>
          <p className="study-plan-empty-desc">
            Thiết lập hải trình ôn tập thông minh bằng thuật toán lặp lại ngắt quãng (SM-2). Hệ
            thống hoa tiêu sẽ tự động phân bổ từ cần học mỗi ngày theo hạn chót của bạn.
          </p>
          <button
            type="button"
            className="btn-start-today btn-create-plan-primary"
            onClick={() => openCreateModal()}
          >
            <Plus size={18} />
            <span>Khởi hành hải trình mới</span>
          </button>
        </div>
      </div>
    );
  }

  const handleTogglePause = async () => {
    try {
      const newStatus = activePlan.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      await updatePlanSettings({ status: newStatus });
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
      await updatePlanSettings({
        targetDate: editTargetDate,
        maxNewWordsPerDay: Number(editMaxNewWords),
        hardGateEnabled: editHardGate,
      });
      setIsSettingsOpen(false);
    } catch (err) {
      console.error('Failed to update plan settings', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleSelectionMode = () => {
    setIsMobileMenuOpen(false);
    setIsSelectionMode((prev) => {
      if (prev) {
        setSelectedDeckIds([]);
        lastClickedIndexRef.current = null;
      }
      return !prev;
    });
  };

  const handleSelectAllChange = (e) => {
    if (e.target.checked) {
      setSelectedDeckIds(enrolledDecks.map((d) => d.id));
    } else {
      setSelectedDeckIds([]);
    }
  };

  const handleToggleDeckRow = (deckId, index, shiftKey = false) => {
    setSelectedDeckIds((prev) => {
      const currentSet = new Set(prev);
      const isCurrentlySelected = currentSet.has(deckId);
      const shouldSelect = !isCurrentlySelected;

      if (shiftKey && lastClickedIndexRef.current !== null && lastClickedIndexRef.current !== index) {
        const start = Math.min(lastClickedIndexRef.current, index);
        const end = Math.max(lastClickedIndexRef.current, index);
        for (let i = start; i <= end; i++) {
          const targetId = enrolledDecks[i]?.id;
          if (targetId != null) {
            if (shouldSelect) {
              currentSet.add(targetId);
            } else {
              currentSet.delete(targetId);
            }
          }
        }
      } else if (shouldSelect) {
        currentSet.add(deckId);
      } else {
        currentSet.delete(deckId);
      }

      lastClickedIndexRef.current = index;
      return Array.from(currentSet);
    });
  };

  const executeImmediateRemoval = (decksList) => {
    const ids = decksList.map((d) => d.id);
    const meta = decksList.map((d) => ({
      id: d.id,
      name: d.name,
      sortOrder: d.sortOrder ?? 0,
    }));
    setSelectedDeckIds((prev) => prev.filter((id) => !ids.includes(id)));
    if (isSelectionMode && ids.length >= selectedDeckIds.length) {
      setIsSelectionMode(false);
    }
    removeDecks(ids, meta);
  };

  /**
   * Threshold Confirmation Rule:
   * - Removing >= 5 decks OR removing all remaining decks in displayPlan -> Show Confirmation Modal
   * - Removing 1..4 decks (with at least 1 deck left in plan) -> Immediate removal + App-level Undo Toast
   */
  const requestRemoveDecks = (decksList) => {
    if (!decksList || decksList.length === 0) return;
    const isRemovingAllRemaining =
      enrolledDecks.length > 0 && decksList.length >= enrolledDecks.length;
    const exceedsBulkThreshold = decksList.length >= BULK_CONFIRM_THRESHOLD;

    if (isRemovingAllRemaining || exceedsBulkThreshold) {
      setPendingConfirmDecks(decksList);
    } else {
      executeImmediateRemoval(decksList);
    }
  };

  const handleConfirmModalRemove = () => {
    if (!pendingConfirmDecks || pendingConfirmDecks.length === 0) return;
    const toRemove = pendingConfirmDecks;
    setPendingConfirmDecks(null);
    executeImmediateRemoval(toRemove);
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

  const isPlanEmptyOfDecks = enrolledDecks.length === 0;
  const todayTotalCount = todayQueue
    ? todayQueue.totalWords || 0
    : activePlan.todayStats?.totalCount || 0;
  const todayDueCount = todayQueue
    ? todayQueue.dueWords || 0
    : activePlan.todayStats?.dueCount || 0;
  const todayWeakCount = todayQueue
    ? todayQueue.weakWords || 0
    : activePlan.todayStats?.weakCount || 0;
  const todayNewCount = todayQueue
    ? todayQueue.newWords || 0
    : activePlan.todayStats?.newCount || 0;

  const confirmModalTitle =
    pendingConfirmDecks && pendingConfirmDecks.length >= enrolledDecks.length
      ? 'Gỡ toàn bộ bộ từ khỏi lộ trình?'
      : `Xóa ${pendingConfirmDecks?.length || 0} bộ từ khỏi lộ trình?`;

  const confirmModalMessage =
    pendingConfirmDecks && pendingConfirmDecks.length === 1
      ? `Bạn sắp gỡ bộ từ "${pendingConfirmDecks[0].name}" (bộ từ duy nhất còn lại) khỏi lộ trình. Lộ trình sẽ tạm thời trống cho đến khi bạn thêm bộ từ mới. Lịch sử tiến độ SM-2 vẫn được bảo toàn.`
      : `Bạn có chắc muốn gỡ ${pendingConfirmDecks?.length || 0} bộ từ đã chọn khỏi lộ trình ôn tập? Lịch sử tiến độ ghi nhớ SM-2 của từng từ vựng vẫn được giữ nguyên.`;

  return (
    <div className="study-plan-page">
      {/* 1. Header */}
      <div className="study-plan-header">
        <div className="study-plan-title-group">
          <h1>
            <span>{activePlan.name}</span>
            <span
              className={`study-plan-badge ${
                activePlan.status === 'ACTIVE'
                  ? 'study-plan-badge-active'
                  : 'study-plan-badge-paused'
              }`}
            >
              {activePlan.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
            </span>
          </h1>
          <p className="study-plan-subtitle">
            Hạn chót: <strong>{activePlan.targetDate}</strong> (
            {daysRemaining > 0 ? `Còn ${daysRemaining} ngày` : 'Đã đến hạn'})
            {' • '}Mục tiêu: {activePlan.maxNewWordsPerDay} từ mới/ngày
            {activePlan.hardGateEnabled && ' • Khóa tập trung'}
          </p>
        </div>

        <div className="study-plan-header-actions">
          <button
            type="button"
            className="btn-plan-secondary btn-plan-back"
            onClick={() => navigate('/library')}
            title="Quay lại Thư viện bộ từ"
          >
            <ArrowLeft size={15} />
            <span>Thư viện</span>
          </button>

          <button type="button" className="btn-plan-secondary" onClick={handleTogglePause}>
            {activePlan.status === 'ACTIVE' ? <Pause size={15} /> : <Play size={15} />}
            <span>{activePlan.status === 'ACTIVE' ? 'Tạm dừng' : 'Tiếp tục'}</span>
          </button>

          <button type="button" className="btn-plan-secondary" onClick={handleOpenSettings}>
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
              className={`hero-gauge-progress ${
                !isPlanEmptyOfDecks && todayTotalCount === 0 ? 'is-complete' : ''
              }`}
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={
                isPlanEmptyOfDecks
                  ? 2 * Math.PI * 40
                  : todayTotalCount === 0
                  ? 0
                  : 2 *
                    Math.PI *
                    40 *
                    Math.min(
                      0.9,
                      Math.max(0.15, todayTotalCount / (activePlan.maxNewWordsPerDay || 30))
                    )
              }
              strokeLinecap="round"
            />
          </svg>
          <div className="hero-gauge-center">
            {isPlanEmptyOfDecks ? (
              <span className="hero-gauge-num">0</span>
            ) : todayTotalCount === 0 ? (
              <CheckCircle2 size={20} className="hero-gauge-done-icon" />
            ) : (
              <>
                <span className="hero-gauge-num">{todayTotalCount}</span>
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

          {isPlanEmptyOfDecks ? (
            <>
              <h2 className="study-plan-hero-title">Lộ trình hiện chưa có bộ từ nào</h2>
              <p className="study-plan-hero-done-desc">
                Hãy thêm bộ từ vựng vào lộ trình để hệ thống chuẩn bị phiên học hôm nay cho bạn.
              </p>
            </>
          ) : todayTotalCount > 0 ? (
            <>
              <h2 className="study-plan-hero-title">
                Hôm nay bạn có {todayTotalCount} từ cần ôn tập
              </h2>
              <div className="study-plan-breakdown-pills">
                {todayDueCount > 0 && (
                  <span className="breakdown-pill">
                    <strong>{todayDueCount}</strong> Đến hạn ôn
                  </span>
                )}
                {todayWeakCount > 0 && (
                  <span className="breakdown-pill">
                    <strong>{todayWeakCount}</strong> Cần củng cố
                  </span>
                )}
                {todayNewCount > 0 && (
                  <span className="breakdown-pill">
                    <strong>{todayNewCount}</strong> Từ mới
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="study-plan-hero-title">Bạn đã hoàn thành mục tiêu hôm nay!</h2>
              <p className="study-plan-hero-done-desc">
                Tuyệt vời! Thuật toán SM-2 sẽ chuẩn bị danh sách từ ôn tập tiếp theo vào lúc 4:00 AM
                ngày mai.
              </p>
            </>
          )}
        </div>

        <div className="study-plan-hero-action">
          <button
            type="button"
            className="btn-start-today"
            disabled={isPlanEmptyOfDecks || todayTotalCount === 0 || activePlan.status !== 'ACTIVE'}
            onClick={() => navigate('/study-plan/learn')}
          >
            <span>
              {isPlanEmptyOfDecks
                ? 'Chưa có bộ từ'
                : todayTotalCount > 0
                ? 'Bắt đầu học ngay'
                : 'Đã xong hôm nay'}
            </span>
            <ArrowRight size={18} />
          </button>
          {activePlan.status === 'PAUSED' && (
            <span className="study-plan-hero-paused-hint">
              Hải trình đang tạm dừng. Hãy bấm Tiếp tục để học.
            </span>
          )}
        </div>
      </div>

      {/* 3. Main 2-Column Layout */}
      <div className="study-plan-main-grid">
        {/* Left Column: Progress Overview & Enrolled Decks */}
        <div className="study-plan-left-column">
          {/* Progress Overview Card */}
          <div
            className={`study-plan-progress-container ${isMutatingDecks ? 'is-syncing-stats' : ''}`}
            aria-busy={isMutatingDecks}
          >
            <div className="progress-header">
              <span>Tiến độ tổng thể</span>
              <span>
                {masteredWords} / {totalWords} từ ({progressPercent}%)
              </span>
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
                <span>Các bộ từ trong lộ trình ({enrolledDecks.length})</span>
              </h3>

              <div className="section-header-actions">
                {enrolledDecks.length > 0 && (
                  <>
                    {/* Desktop Bulk Select Toggle */}
                    <button
                      type="button"
                      className={`btn-select-decks-mode ${isSelectionMode ? 'is-active' : ''}`}
                      onClick={toggleSelectionMode}
                    >
                      {isSelectionMode ? <X size={15} /> : <CheckSquare size={15} />}
                      <span>{isSelectionMode ? 'Hủy chọn' : 'Chọn nhiều'}</span>
                    </button>

                    {/* Mobile Compact Menu (<= 640px) */}
                    <div className="mobile-deck-actions-menu-wrap">
                      <button
                        type="button"
                        className="btn-mobile-deck-menu"
                        onClick={() => setIsMobileMenuOpen((v) => !v)}
                        aria-label="Tùy chọn quản lý bộ từ"
                        aria-expanded={isMobileMenuOpen}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {isMobileMenuOpen && (
                        <div className="mobile-deck-dropdown">
                          <button type="button" onClick={toggleSelectionMode}>
                            {isSelectionMode ? <X size={14} /> : <CheckSquare size={14} />}
                            <span>{isSelectionMode ? 'Thoát chế độ chọn' : 'Chọn nhiều bộ từ'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <button
                  type="button"
                  className="btn-add-deck-primary"
                  onClick={() => openAddDecksModal()}
                >
                  <Plus size={15} />
                  <span>Thêm bộ từ</span>
                </button>
              </div>
            </div>

            {enrolledDecks.length === 0 ? (
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
                    {isSelectionMode && (
                      <th className="col-deck-checkbox">
                        <input
                          ref={selectAllCheckboxRef}
                          type="checkbox"
                          className="study-plan-deck-checkbox"
                          checked={allSelected}
                          onChange={handleSelectAllChange}
                          aria-label="Chọn tất cả bộ từ trong lộ trình"
                        />
                      </th>
                    )}
                    <th>Tên bộ từ</th>
                    <th>Số lượng thẻ</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledDecks.map((deck, index) => {
                    const isChecked = selectedIdSet.has(deck.id);
                    return (
                      <tr
                        key={deck.id}
                        className={`${isSelectionMode ? 'is-selectable-row' : ''} ${
                          isChecked ? 'is-row-selected' : ''
                        }`}
                        onClick={(e) => {
                          if (!isSelectionMode) return;
                          if (e.target.closest('button, a, input, label')) return;
                          handleToggleDeckRow(deck.id, index, e.shiftKey);
                        }}
                      >
                        {isSelectionMode && (
                          <td className="col-deck-checkbox">
                            <input
                              type="checkbox"
                              className="study-plan-deck-checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleDeckRow(deck.id, index, e.shiftKey);
                              }}
                              aria-label={`Chọn bộ từ ${deck.name}`}
                            />
                          </td>
                        )}
                        <td style={{ fontWeight: 500 }}>{deck.name}</td>
                        <td>{deck.cardCount ?? 0} thẻ</td>
                        <td>
                          <button
                            type="button"
                            className="btn-remove-deck"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestRemoveDecks([deck]);
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Xóa</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: 4 Stats Cards in 2x2 Grid (Sticky) */}
        <div className="study-plan-right-column">
          <div
            className={`study-plan-stats-grid-sticky ${isMutatingDecks ? 'is-syncing-stats' : ''}`}
            aria-busy={isMutatingDecks}
          >
            <div className="stat-box">
              <span className="stat-box-label">Tổng số từ duy nhất</span>
              <span className="stat-box-value">{totalWords}</span>
              <span className="stat-box-meta">
                Đã khử trùng giữa {enrolledDecks.length} bộ từ
              </span>
            </div>

            <div className="stat-box">
              <span className="stat-box-label">Từ đã thành thạo</span>
              <span className="stat-box-value stat-val-mastered">{masteredWords}</span>
              <span className="stat-box-meta">Độ chính xác &ge; 80% &bull; &ge; 2 lần lặp</span>
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

      {/* Floating Bulk Action Bar */}
      {isSelectionMode && selectedDeckIds.length > 0 && (
        <div
          className="study-plan-bulk-fab"
          role="region"
          aria-label="Thanh tác vụ xóa hàng loạt"
        >
          <div className="study-plan-bulk-fab__summary" aria-live="polite">
            <strong>Đã chọn: {selectedDeckIds.length} bộ từ</strong>
            <span>({selectedTotalCards} thẻ)</span>
          </div>

          <div className="study-plan-bulk-fab__actions">
            <button
              type="button"
              className="study-plan-bulk-fab__clear-btn"
              onClick={() => setSelectedDeckIds([])}
            >
              Bỏ chọn
            </button>
            <button
              type="button"
              className="study-plan-bulk-fab__remove-btn"
              onClick={() => {
                const selectedDecks = enrolledDecks.filter((d) => selectedIdSet.has(d.id));
                requestRemoveDecks(selectedDecks);
              }}
            >
              <Trash2 size={15} />
              <span>Xóa {selectedDeckIds.length} bộ từ đã chọn</span>
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div
          className="study-plan-modal-backdrop"
          onClick={() => setIsSettingsOpen(false)}
          role="dialog"
        >
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
                    Mặc định là thông báo mềm. Khi bật tùy chọn này, màn hình sẽ bị khóa cho đến khi
                    bạn hoàn thành các từ cần học hôm nay.
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

      {/* Confirm bulk/all deck removal dialog */}
      <ConfirmDialog
        isOpen={Boolean(pendingConfirmDecks && pendingConfirmDecks.length > 0)}
        title={confirmModalTitle}
        message={confirmModalMessage}
        confirmText="Xóa khỏi lộ trình"
        onConfirm={handleConfirmModalRemove}
        onCancel={() => setPendingConfirmDecks(null)}
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
