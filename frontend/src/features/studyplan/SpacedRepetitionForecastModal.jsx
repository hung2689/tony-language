import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, BookOpen, RotateCcw, Target, Sparkles } from 'lucide-react';
import Ripple from '../../components/common/Ripple';
import { studyPlanService } from '../../services/studyPlanService';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';
import './SpacedRepetitionForecastModal.css';

/**
 * Maps backend day labels (Th2, Th3, etc.) to full Vietnamese labels
 */
function formatDayLabel(raw) {
  if (!raw) return '';
  const map = {
    Th2: 'Thứ 2',
    Th3: 'Thứ 3',
    Th4: 'Thứ 4',
    Th5: 'Thứ 5',
    Th6: 'Thứ 6',
    Th7: 'Thứ 7',
    CN: 'CN',
  };
  return map[raw] || raw;
}

export default function SpacedRepetitionForecastModal({
  isOpen,
  onClose,
  deckId = null,
  deckName = null,
  onStart,
  onStartReview,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Lock scroll on open
  useEffect(() => {
    if (isOpen) {
      lockScroll();
    }
    return () => {
      if (isOpen) {
        unlockScroll();
      }
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;
    async function loadForecast() {
      setLoading(true);
      setError('');
      try {
        let res;
        if (deckId) {
          res = await studyPlanService.getDeckForecast(deckId);
        } else {
          res = await studyPlanService.getPlanForecast();
        }
        if (!ignore) {
          setData(res);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Không thể tải dự báo ôn tập');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadForecast();
    return () => {
      ignore = true;
    };
  }, [isOpen, deckId]);

  const maxCount = useMemo(() => {
    const list = Array.isArray(data?.forecast7Days) ? data.forecast7Days : [];
    if (list.length === 0) return 1;
    const maxVal = Math.max(...list.map((d) => d?.count || 0));
    return maxVal > 0 ? maxVal : 1;
  }, [data]);

  const handleStartAction = useCallback(() => {
    onClose();
    if (typeof onStart === 'function') {
      onStart(deckId);
    } else if (typeof onStartReview === 'function') {
      onStartReview(deckId);
    }
  }, [deckId, onClose, onStart, onStartReview]);

  if (!isOpen) return null;

  const titleName = deckName || data?.deckName || null;
  const dueCount = data?.dueCount ?? 0;
  const masteredCount = data?.masteredCount ?? 0;
  const totalCount = data?.totalCount ?? 0;
  const forecastDays = Array.isArray(data?.forecast7Days) ? data.forecast7Days : [];
  const allCaughtUp = dueCount === 0 && totalCount > 0;

  return (
    <div
      className="srs-popup-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="srs-popup-title"
    >
      <div className="srs-popup-card">
        {/* Cutout Asset: Top-left Compass Rose with Foliage */}
        <img
          src="/assets/popup/popup_compass_rose.png"
          alt=""
          className="srs-popup-compass-rose"
          aria-hidden="true"
        />

        {/* Cutout Asset: Top-right Antique Close Button */}
        <button
          type="button"
          className="srs-popup-close-btn"
          onClick={onClose}
          aria-label="Đóng cửa sổ"
        >
          <img
            src="/assets/popup/popup_close_button.png"
            alt="Đóng"
            className="srs-popup-close-img"
          />
        </button>

        {/* Cutout Asset: Subtle Maritime Waves at bottom-left */}
        <img
          src="/assets/popup/popup_wave_decor.png"
          alt=""
          className="srs-popup-wave-decor"
          aria-hidden="true"
        />

        {/* Cutout Asset: Subtle Pirate Ship at bottom-right */}
        <img
          src="/assets/popup/popup_ship_decor.png"
          alt=""
          className="srs-popup-ship-decor"
          aria-hidden="true"
        />

        {/* Header Section */}
        <div className="srs-popup-header">
          <h2 id="srs-popup-title" className="srs-popup-main-title">
            Lặp lại ngắt quãng
          </h2>
          <p className="srs-popup-subtitle">
            Ôn tập theo lịch trình để ghi nhớ lâu hơn và hiệu quả hơn.
          </p>

          {titleName && (
            <div className="srs-popup-deck-badge">
              <span className="srs-popup-deck-badge-icon">⚓</span>
              <span className="srs-popup-deck-badge-text">{titleName}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="srs-popup-loading-box">
            <Ripple size={44} color="#795431" />
            <span className="srs-popup-loading-text">
              Đang tính toán phân bổ hải trình ôn tập...
            </span>
          </div>
        ) : error ? (
          <div className="srs-popup-error-box">
            <span className="srs-popup-error-text">{error}</span>
          </div>
        ) : (
          <div className="srs-popup-body">
            {/* Vintage Parchment Stats Panel with Woodcut/Ink Icons */}
            <div className="srs-popup-stats-panel">
              <div className="srs-popup-stat-col">
                <BookOpen size={24} className="srs-popup-stat-icon srs-stat-icon-due" strokeWidth={2.2} />
                <div className="srs-popup-stat-info">
                  <span className="srs-popup-stat-val">{dueCount}</span>
                  <span className="srs-popup-stat-label">Từ cần ôn</span>
                </div>
              </div>

              <div className="srs-popup-stat-divider" aria-hidden="true" />

              <div className="srs-popup-stat-col">
                <RotateCcw size={24} className="srs-popup-stat-icon srs-stat-icon-reviewed" strokeWidth={2.2} />
                <div className="srs-popup-stat-info">
                  <span className="srs-popup-stat-val">{masteredCount}</span>
                  <span className="srs-popup-stat-label">Đã ôn hôm nay</span>
                </div>
              </div>

              <div className="srs-popup-stat-divider" aria-hidden="true" />

              <div className="srs-popup-stat-col">
                <Target size={24} className="srs-popup-stat-icon srs-stat-icon-total" strokeWidth={2.2} />
                <div className="srs-popup-stat-info">
                  <span className="srs-popup-stat-val">{totalCount}</span>
                  <span className="srs-popup-stat-label">Tổng số từ</span>
                </div>
              </div>
            </div>

            {/* Antique Ribbon Banner when all words are reviewed today */}
            {allCaughtUp && (
              <div className="srs-popup-complete-banner">
                <Sparkles size={16} className="srs-popup-complete-icon" />
                <span className="srs-popup-complete-text">
                  Thuyền trưởng đã hoàn thành toàn bộ mục tiêu hôm nay!
                </span>
              </div>
            )}

            {/* Vintage Parchment 7-Day Forecast Section */}
            <div className="srs-popup-chart-card">
              <div className="srs-popup-chart-header">
                <h3 className="srs-popup-chart-title">Dự báo ôn tập 7 ngày tới</h3>
              </div>

              <div className="srs-popup-bars-row">
                {forecastDays.map((day, idx) => {
                  const count = day.count || 0;
                  const ratio = count / maxCount;
                  // Min 5px notch so empty days still show a clean brass baseline rivet, max 78px
                  const barHeightPx =
                    count === 0 ? 4 : Math.max(12, Math.round(ratio * 78));

                  return (
                    <div
                      key={day.date || idx}
                      className={`srs-popup-col ${day.isToday ? 'is-today' : ''}`}
                    >
                      <span className="srs-popup-count-badge">
                        {count > 0 ? count : 0}
                      </span>

                      <div className="srs-popup-bar-track">
                        <div
                          className="srs-popup-bar-fill"
                          style={{ height: `${barHeightPx}px` }}
                        />
                      </div>

                      <div className="srs-popup-day-info">
                        <span className="srs-popup-day-name">
                          {formatDayLabel(day.dayLabel)}
                        </span>
                        {day.isToday && (
                          <span className="srs-popup-today-stamp">Nay</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vintage Explorer Action Button */}
            <div className="srs-popup-actions">
              <button
                type="button"
                className="srs-popup-cta-btn"
                onClick={handleStartAction}
              >
                <Calendar size={19} strokeWidth={2.4} />
                <span>Lặp lại ngắt quãng</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
