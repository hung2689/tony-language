import { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import './Analytics.css';

const MONTH_NAMES = [
  'Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6',
  'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'
];

const CURRENT_CALENDAR_YEAR = new Date().getFullYear();

export default function ActivityHeatmap({ heatmapData, currentYear, onYearChange }) {
  const [tooltip, setTooltip] = useState(null);

  // Map of date string -> activity info
  const activityMap = useMemo(() => {
    const map = new Map();
    if (heatmapData?.days) {
      for (const d of heatmapData.days) {
        map.set(d.date, d);
      }
    }
    return map;
  }, [heatmapData]);

  // Generate 53 weeks of the year
  const weeks = useMemo(() => {
    const result = [];
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);

    // Find the Monday on or before Jan 1st
    const firstMonday = new Date(startDate);
    const dayOffset = (firstMonday.getDay() + 6) % 7; // Monday = 0
    firstMonday.setDate(firstMonday.getDate() - dayOffset);

    const curr = new Date(firstMonday);
    while (curr <= endDate || result.length < 52) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const year = curr.getFullYear();
        const month = String(curr.getMonth() + 1).padStart(2, '0');
        const day = String(curr.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const isCurrentYear = curr.getFullYear() === currentYear;

        const data = activityMap.get(dateStr);
        week.push({
          dateStr,
          isCurrentYear,
          level: isCurrentYear && data ? data.level : 0,
          totalQuestions: data ? data.totalQuestions : 0,
          accuracy: data ? data.accuracy : 0,
        });

        curr.setDate(curr.getDate() + 1);
      }
      result.push(week);
      if (curr > endDate && result.length >= 52) break;
    }

    return result;
  }, [currentYear, activityMap]);

  return (
    <div className="analytics-section">
      <div className="analytics-section-header">
        <h3 className="analytics-section-title">
          <Calendar size={18} />
          <span>Biểu đồ hoạt động ({currentYear})</span>
        </h3>

        <div className="heatmap-year-selector">
          <button
            type="button"
            className="heatmap-year-btn"
            onClick={() => onYearChange(currentYear - 1)}
            title="Năm trước"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="heatmap-year-display">{currentYear}</span>
          <button
            type="button"
            className="heatmap-year-btn"
            onClick={() => onYearChange(currentYear + 1)}
            disabled={currentYear >= CURRENT_CALENDAR_YEAR}
            title="Năm sau"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="heatmap-container">
        <div className="heatmap-scroll-area">
          {/* Months labels */}
          <div className="heatmap-months-row">
            {MONTH_NAMES.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>

          <div className="heatmap-body">
            {/* Day of week labels */}
            <div className="heatmap-day-labels">
              <span>T2</span>
              <span>T4</span>
              <span>T6</span>
              <span>CN</span>
            </div>

            {/* Weeks columns */}
            <div className="heatmap-weeks-grid">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="heatmap-week-col">
                  {week.map((day) => (
                    <div
                      key={day.dateStr}
                      className={`heatmap-cell level-${day.level}`}
                      style={{ visibility: day.isCurrentYear ? 'visible' : 'hidden' }}
                      onMouseEnter={(e) => {
                        const rect = e.target.getBoundingClientRect();
                        setTooltip({
                          date: day.dateStr,
                          totalQuestions: day.totalQuestions,
                          accuracy: day.accuracy,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="heatmap-legend">
            <span>Ít hơn</span>
            <div className="legend-swatch level-0" />
            <div className="legend-swatch level-1" />
            <div className="legend-swatch level-2" />
            <div className="legend-swatch level-3" />
            <div className="legend-swatch level-4" />
            <span>Nhiều hơn</span>
          </div>
        </div>
      </div>

      {/* Floating Tooltip */}
      {tooltip && (
        <div
          className="heatmap-vintage-tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div className="tooltip-date">{tooltip.date}</div>
          <div className="tooltip-details">
            {tooltip.totalQuestions > 0
              ? `${tooltip.totalQuestions} câu hỏi • Chính xác ${tooltip.accuracy}%`
              : 'Không có hoạt động học'}
          </div>
        </div>
      )}
    </div>
  );
}
