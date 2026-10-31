import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X, PlusCircle, Check } from 'lucide-react';
import { studyPlanService } from '../../services/studyPlanService';
import { deckService } from '../../services/deckService';
import Ripple from '../../components/common/Ripple';
import { useStudyPlan } from './StudyPlanContext';
import './StudyPlan.css';

export default function AddDecksPreviewModal({ isOpen, onClose, targetDeckIds = [] }) {
  const { activePlan, refreshPlan } = useStudyPlan();

  const [availableDecks, setAvailableDecks] = useState([]);
  const [selectedDeckIds, setSelectedDeckIds] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Strategy: 'KEEP_DEADLINE' | 'EXTEND_DEADLINE' | 'INCREASE_CAP'
  const [strategy, setStrategy] = useState('KEEP_DEADLINE');

  // Load decks
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingDecks(true);

    deckService.getDecks()
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        // Filter out decks already in the active plan
        const enrolledIds = new Set((activePlan?.decks || []).map((d) => d.id));
        const notEnrolled = list.filter((d) => !enrolledIds.has(d.id));
        setAvailableDecks(notEnrolled);

        if (targetDeckIds && targetDeckIds.length > 0) {
          setSelectedDeckIds(targetDeckIds.map(Number));
        } else if (notEnrolled.length > 0) {
          setSelectedDeckIds([notEnrolled[0].id]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMsg(err.message || 'Không thể tải danh sách bộ từ');
      })
      .finally(() => {
        if (isMounted) setLoadingDecks(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetDeckIds, activePlan]);

  // Compute preview
  const runPreview = useCallback(async () => {
    if (!activePlan || selectedDeckIds.length === 0) {
      setPreviewData(null);
      return;
    }
    try {
      // Combine active plan existing decks with newly selected decks
      const existingDeckIds = (activePlan.decks || []).map((d) => d.id);
      const combinedIds = Array.from(new Set([...existingDeckIds, ...selectedDeckIds]));

      const res = await studyPlanService.previewAddDecks({
        deckIds: combinedIds,
        targetDate: activePlan.targetDate,
        maxNewWordsPerDay: activePlan.maxNewWordsPerDay || 50,
      });
      setPreviewData(res || null);
    } catch {
      setPreviewData(null);
    }
  }, [activePlan, selectedDeckIds]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(runPreview, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, runPreview]);

  if (!isOpen || !activePlan) return null;

  const toggleDeck = (id) => {
    setSelectedDeckIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedDeckIds.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất một bộ từ.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      let newTargetDate = activePlan.targetDate;
      let newMaxNewWordsPerDay = activePlan.maxNewWordsPerDay;

      if (strategy === 'EXTEND_DEADLINE' && previewData) {
        // Calculate needed days to keep maxNewWordsPerDay
        const neededDays = Math.ceil(previewData.totalWords / (activePlan.maxNewWordsPerDay || 50));
        const d = new Date();
        d.setDate(d.getDate() + neededDays);
        newTargetDate = d.toISOString().split('T')[0];
      } else if (strategy === 'INCREASE_CAP' && previewData) {
        newMaxNewWordsPerDay = previewData.avgWordsPerDay;
      }

      await studyPlanService.addDecksToActivePlan({
        deckIds: selectedDeckIds,
        overloadStrategy: strategy,
        newTargetDate,
        newMaxNewWordsPerDay,
      });

      await refreshPlan();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Không thể thêm bộ từ vào lộ trình.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="study-plan-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="study-plan-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="study-plan-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: '#3B2B1C' }}>
            <PlusCircle size={22} style={{ color: '#A8783E' }} />
            <h2 className="study-plan-modal-title">Thêm bộ từ vào lộ trình</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            title="Đóng"
            aria-label="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="study-plan-modal-body">
            {errorMsg && (
              <div className="overload-alert-box" style={{ background: 'rgba(153, 43, 43, 0.12)', borderColor: '#992B2B', color: '#992B2B' }}>
                <AlertTriangle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <span className="plan-modal-label">
                Chọn bộ từ muốn thêm ({selectedDeckIds.length})
              </span>

              {loadingDecks ? (
                <div style={{ padding: '1.25rem', textAlign: 'center', color: '#796246', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Ripple size={36} color="#A8783E" />
                  <span>Đang tải danh sách...</span>
                </div>
              ) : availableDecks.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#796246', fontSize: '0.875rem' }}>
                  Tất cả bộ từ của bạn đã có trong lộ trình này!
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    border: '1.5px solid #D6C29E',
                    borderRadius: '0.5rem',
                    padding: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.375rem',
                    backgroundColor: '#FDF8EE',
                  }}
                >
                  {availableDecks.map((deck) => {
                    const isSelected = selectedDeckIds.includes(deck.id);
                    return (
                      <div
                        key={deck.id}
                        onClick={() => toggleDeck(deck.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.625rem',
                          padding: '0.5rem 0.625rem',
                          borderRadius: '0.375rem',
                          backgroundColor: isSelected ? '#FAF2DE' : 'transparent',
                          border: isSelected ? '1px solid #A8783E' : '1px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '4px',
                            border: `1.5px solid ${isSelected ? '#46583A' : '#C4A97D'}`,
                            backgroundColor: isSelected ? '#46583A' : '#FAF0DA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FAF0DA',
                          }}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#3B2B1C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {deck.name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#796246' }}>
                            {deck.cardCount ?? deck.termCount ?? 0} thẻ
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Preview calculation */}
            {previewData && (
              <div
                style={{
                  backgroundColor: '#FAF2DE',
                  border: '1.5px solid #D6C29E',
                  borderRadius: '0.625rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5A442E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Khối lượng sau khi thêm
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#796246' }}>Tổng số từ</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#3B2B1C' }}>
                      {previewData.totalWords} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>từ</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#796246' }}>Thời gian còn</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#3B2B1C' }}>
                      {previewData.daysRemaining} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>ngày</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#796246' }}>Mức trung bình</div>
                    <div
                      style={{
                        fontSize: '1.35rem',
                        fontWeight: 800,
                        color: previewData.isOverloaded ? '#992B2B' : '#2E6B38',
                      }}
                    >
                      ~{previewData.avgWordsPerDay} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>từ/ngày</span>
                    </div>
                  </div>
                </div>

                {previewData.isOverloaded && (
                  <div className="overload-alert-box">
                    <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2, color: '#992B2B' }} />
                    <div style={{ color: '#8C5819' }}>
                      <strong style={{ color: '#992B2B' }}>Cảnh báo quá tải:</strong> Khối lượng mới (~{previewData.avgWordsPerDay} từ/ngày) vượt mức tối đa hiện tại ({activePlan.maxNewWordsPerDay} từ/ngày). Vui lòng chọn cách xử lý bên dưới:
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Overload Resolution Strategies */}
            <div>
              <span className="plan-modal-label">
                Phương án điều chỉnh tiến độ
              </span>
              <div className="strategy-options-group">
                <label className={`strategy-option-card ${strategy === 'KEEP_DEADLINE' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="strategy"
                    value="KEEP_DEADLINE"
                    checked={strategy === 'KEEP_DEADLINE'}
                    onChange={() => setStrategy('KEEP_DEADLINE')}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3B2B1C' }}>
                      Giữ nguyên hạn chót
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#6E5336', marginTop: 2 }}>
                      Chấp nhận học dồn nhiều từ hơn mỗi ngày để hoàn thành đúng hạn {activePlan.targetDate}.
                    </div>
                  </div>
                </label>

                <label className={`strategy-option-card ${strategy === 'EXTEND_DEADLINE' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="strategy"
                    value="EXTEND_DEADLINE"
                    checked={strategy === 'EXTEND_DEADLINE'}
                    onChange={() => setStrategy('EXTEND_DEADLINE')}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3B2B1C' }}>
                      Tự động lùi hạn chót
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#6E5336', marginTop: 2 }}>
                      Kéo dài số ngày cần học để giữ nguyên số từ mỗi ngày ({activePlan.maxNewWordsPerDay} từ/ngày).
                    </div>
                  </div>
                </label>

                <label className={`strategy-option-card ${strategy === 'INCREASE_CAP' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="strategy"
                    value="INCREASE_CAP"
                    checked={strategy === 'INCREASE_CAP'}
                    onChange={() => setStrategy('INCREASE_CAP')}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3B2B1C' }}>
                      Nâng hạn mức từ mỗi ngày
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#6E5336', marginTop: 2 }}>
                      Tăng mức tối đa lên bằng khối lượng trung bình mới (~{previewData?.avgWordsPerDay || 50} từ/ngày).
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="study-plan-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="plan-modal-btn-cancel"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || selectedDeckIds.length === 0}
              className="plan-modal-btn-submit"
            >
              {submitting ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Ripple size={16} color="#FAF0DA" />
                  <span>Đang thêm...</span>
                </span>
              ) : (
                'Xác nhận thêm'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
