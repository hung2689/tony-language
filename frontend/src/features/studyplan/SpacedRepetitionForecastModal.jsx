import { useState, useEffect, useMemo } from 'react';
import { Calendar, X } from 'lucide-react';
import { studyPlanService } from '../../services/studyPlanService';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';
import './SpacedRepetitionForecastModal.css';

export default function SpacedRepetitionForecastModal({
  isOpen,
  onClose,
  deckId = null,
  deckName = null,
  onStart,
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

  if (!isOpen) return null;

  const titleName = deckName || data?.deckName || 'Lộ trình ôn tập';
  const dueCount = data?.dueCount ?? 0;
  const masteredCount = data?.masteredCount ?? 0;
  const totalCount = data?.totalCount ?? 0;
  const forecastDays = Array.isArray(data?.forecast7Days) ? data.forecast7Days : [];

  return (
    <div
      className="srs-forecast-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="srs-forecast-title"
    >
      <div className="srs-forecast-modal-card">
        {/* Header */}
        <div className="srs-forecast-header">
          <div className="srs-forecast-title-group">
            <div className="srs-forecast-title-row">
              <Calendar size={22} className="srs-forecast-title-icon" />
              <h2 id="srs-forecast-title" className="srs-forecast-main-title">
                Lặp lại ngắt quãng
              </h2>
            </div>
            <p className="srs-forecast-deck-name">{titleName}</p>
          </div>

          <button
            type="button"
            className="srs-forecast-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="srs-forecast-loading-box">
            <div className="srs-forecast-spinner" />
            <span>Đang tính toán phân bổ 7 ngày...</span>
          </div>
        ) : error ? (
          <div className="srs-forecast-loading-box">
            <span style={{ color: '#ef4444' }}>{error}</span>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="srs-forecast-stats-row">
              <div className="srs-forecast-stat-item">
                <span className="srs-forecast-stat-label">Từ đến hạn:</span>
                <span className="srs-forecast-stat-val">{dueCount}</span>
              </div>
              <div className="srs-forecast-stat-item">
                <span className="srs-forecast-stat-label">Thuần thục:</span>
                <span className="srs-forecast-stat-val">{masteredCount}</span>
              </div>
              <div className="srs-forecast-stat-item">
                <span className="srs-forecast-stat-label">Tổng:</span>
                <span className="srs-forecast-stat-val">{totalCount}</span>
              </div>
            </div>

            {/* 7-Day Forecast Bars */}
            <div className="srs-forecast-chart-section">
              <h3 className="srs-forecast-chart-heading">Dự báo ôn tập 7 ngày tới</h3>

              <div className="srs-forecast-bars-container">
                {forecastDays.map((day, idx) => {
                  const count = day.count || 0;
                  const ratio = count / maxCount;
                  // Height between min 6px and max 76px
                  const barHeightPx = count === 0 ? 5 : Math.max(14, Math.round(ratio * 76));

                  return (
                    <div
                      key={day.date || idx}
                      className={`srs-forecast-col ${day.isToday ? 'is-today' : ''}`}
                    >
                      <span className="srs-forecast-count-label">
                        {count > 0 ? count : ''}
                      </span>

                      <div className="srs-forecast-bar-track">
                        <div
                          className="srs-forecast-bar"
                          style={{ height: `${barHeightPx}px` }}
                        />
                      </div>

                      <span className="srs-forecast-day-name">{day.dayLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action CTA Button */}
            <button
              type="button"
              className="srs-forecast-cta-btn"
              onClick={() => {
                onClose();
                onStart?.(deckId);
              }}
            >
              <Calendar size={18} />
              <span>Lặp lại ngắt quãng</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
