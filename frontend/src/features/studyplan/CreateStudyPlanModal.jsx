import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X, Check, BookOpen } from 'lucide-react';
import { deckService } from '../../services/deckService';
import { studyPlanService } from '../../services/studyPlanService';
import { useStudyPlan } from './StudyPlanContext';
import './StudyPlan.css';

function getDefaultTargetDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

function getMinTargetDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export default function CreateStudyPlanModal({ isOpen, onClose, initialDeckId = null }) {
  const navigate = useNavigate();
  const { refreshPlan } = useStudyPlan();

  const [decks, setDecks] = useState([]);
  const [selectedDeckIds, setSelectedDeckIds] = useState([]);
  const [planName, setPlanName] = useState('Lộ trình ôn tập');

  const [targetDate, setTargetDate] = useState(getDefaultTargetDate);
  const minDateStr = getMinTargetDate();
  const [maxNewWordsPerDay, setMaxNewWordsPerDay] = useState(50);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [calculatingPreview, setCalculatingPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Fetch available decks
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingDecks(true);
    deckService.getDecks()
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        setDecks(list);

        if (initialDeckId) {
          setSelectedDeckIds([Number(initialDeckId)]);
        } else if (list.length > 0) {
          setSelectedDeckIds([list[0].id]);
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
  }, [isOpen, initialDeckId]);

  // Compute live preview calculation
  const runPreview = useCallback(async () => {
    if (selectedDeckIds.length === 0 || !targetDate) {
      setPreviewData(null);
      return;
    }
    setCalculatingPreview(true);
    try {
      const res = await studyPlanService.previewAddDecks({
        deckIds: selectedDeckIds,
        targetDate,
        maxNewWordsPerDay: Number(maxNewWordsPerDay) || 50,
      });
      setPreviewData(res || null);
    } catch {
      setPreviewData(null);
    } finally {
      setCalculatingPreview(false);
    }
  }, [selectedDeckIds, targetDate, maxNewWordsPerDay]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(runPreview, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, runPreview]);

  if (!isOpen) return null;

  const toggleDeck = (id) => {
    setSelectedDeckIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedDeckIds.length === decks.length) {
      setSelectedDeckIds([]);
    } else {
      setSelectedDeckIds(decks.map((d) => d.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedDeckIds.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất một bộ từ vựng.');
      return;
    }
    if (!targetDate) {
      setErrorMsg('Vui lòng chọn ngày hoàn thành.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await studyPlanService.createPlan({
        name: planName.trim() || 'Lộ trình ôn tập',
        deckIds: selectedDeckIds,
        targetDate,
        maxNewWordsPerDay: Number(maxNewWordsPerDay) || 50,
        minWordsPerDay: 5,
        hardGateEnabled: false,
      });
      await refreshPlan();
      onClose();
      navigate('/study-plan');
    } catch (err) {
      setErrorMsg(err.message || 'Không thể tạo lộ trình. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="study-plan-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="study-plan-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="study-plan-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={20} />
            <h2 className="study-plan-modal-title">Tạo lộ trình ôn tập</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="study-plan-modal-body">
            {errorMsg && (
              <div className="overload-alert-box" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>
                <AlertTriangle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Plan Name */}
            <div>
              <label htmlFor="plan-name-input" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem', color: '#374151' }}>
                Tên lộ trình
              </label>
              <input
                id="plan-name-input"
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="VD: Ôn thi TOEIC 800, IELTS Vocab..."
                required
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Select Decks */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  Chọn bộ từ ({selectedDeckIds.length}/{decks.length})
                </span>
                {decks.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    {selectedDeckIds.length === decks.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                )}
              </div>

              {loadingDecks ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                  Đang tải danh sách bộ từ...
                </div>
              ) : decks.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                  Chưa có bộ từ nào. Vui lòng tạo bộ từ trước.
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    padding: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.375rem',
                  }}
                >
                  {decks.map((deck) => {
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
                          backgroundColor: isSelected ? '#f4f4f5' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '4px',
                            border: `1.5px solid ${isSelected ? '#18181b' : '#d1d5db'}`,
                            backgroundColor: isSelected ? '#18181b' : '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                          }}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {deck.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {deck.cardCount ?? deck.termCount ?? 0} thẻ
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Target Date & Daily Cap */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label htmlFor="target-date-input" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem', color: '#374151' }}>
                  Ngày hoàn thành
                </label>
                <input
                  id="target-date-input"
                  type="date"
                  min={minDateStr}
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label htmlFor="max-words-input" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem', color: '#374151' }}>
                  Từ mới tối đa/ngày
                </label>
                <input
                  id="max-words-input"
                  type="number"
                  min="5"
                  max="200"
                  value={maxNewWordsPerDay}
                  onChange={(e) => setMaxNewWordsPerDay(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Live Volume Calculation & Overload Alert */}
            {previewData && (
              <div
                style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.625rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase' }}>
                  Khối lượng học dự kiến
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Tổng số từ</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
                      {previewData.totalWords} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>từ</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Thời gian</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
                      {previewData.daysRemaining} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>ngày</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Trung bình/ngày</div>
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: previewData.isOverloaded ? '#b45309' : '#059669',
                      }}
                    >
                      ~{previewData.avgWordsPerDay} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>từ</span>
                    </div>
                  </div>
                </div>

                {previewData.isOverloaded && (
                  <div className="overload-alert-box">
                    <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Cảnh báo quá tải:</strong> Khối lượng trung bình (~{previewData.avgWordsPerDay} từ/ngày)
                      vượt quá hạn mức {previewData.maxNewWordsPerDay} từ mới mỗi ngày. Bạn nên lùi ngày hoàn thành hoặc
                      giảm bớt số bộ từ để ghi nhớ hiệu quả hơn.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="study-plan-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '0.625rem 1.125rem',
                borderRadius: '0.5rem',
                border: '1px solid #d1d5db',
                background: '#ffffff',
                color: '#374151',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || selectedDeckIds.length === 0 || calculatingPreview}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: '#18181b',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: submitting || selectedDeckIds.length === 0 ? 'not-allowed' : 'pointer',
                opacity: submitting || selectedDeckIds.length === 0 ? 0.7 : 1,
              }}
            >
              {submitting ? 'Đang tạo...' : 'Lưu lộ trình'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
