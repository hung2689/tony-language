import { useMemo } from 'react';
import { RotateCcw, ArrowLeft, Trophy, Sparkles } from 'lucide-react';
import Button from '../../components/common/Button';

export default function LearnResults({
  deck,
  items = [],
  stats = {},
  cardStats = {},
  sessionStats = {},
  onRetryMissed,
  onRetryAll,
  onExit,
}) {
  const effectiveStats = (stats && stats.totalWords !== undefined) ? stats : (sessionStats || {});
  const totalCards = effectiveStats.totalWords ?? effectiveStats.totalCards ?? (Array.isArray(items) ? items.length : 0);
  const firstTryCorrectCount = effectiveStats.firstTryCorrectCount ?? 0;
  const totalAttempts = effectiveStats.totalAttempts ?? 0;
  const startTime = effectiveStats.startTime;
  const endTime = effectiveStats.endTime;

  // Study time in mm:ss
  const formattedTime = useMemo(() => {
    if (!startTime || !endTime) return '00:00';
    const totalSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [startTime, endTime]);

  // Accuracy %: accuracy = totalWords > 0 ? Math.round((firstTryCorrectCount / totalWords) * 100) : 0
  const accuracyPercent = useMemo(() => {
    if (!totalCards) return 0;
    return Math.round((firstTryCorrectCount / totalCards) * 100);
  }, [totalCards, firstTryCorrectCount]);

  // Missed cards list: items.filter(item => item.wrongCount > 0)
  const missedCards = useMemo(() => {
    if (Array.isArray(items) && items.length > 0) {
      return items.filter((item) => (item.wrongCount || 0) > 0);
    }
    return Object.values(cardStats).filter(
      (s) => (s.wrongCount || 0) > 0 || !s.firstTryCorrect
    );
  }, [items, cardStats]);

  const hasMissed = missedCards.length > 0;

  return (
    <div className="learn-results-container">
      {/* Confetti Celebration Particles */}
      <div className="learn-confetti-layer" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className={`confetti-item confetti-${i % 6}`} />
        ))}
      </div>

      {/* Header Card */}
      <div className="learn-results-card">
        <div className="learn-results-header">
          <div className="learn-results-trophy">
            <Trophy size={48} className="learn-trophy-icon" />
          </div>
          <h1 className="learn-results-title">Hoàn thành!</h1>
          <p className="learn-results-deck-name">{deck?.name}</p>

          {/* SVG Accuracy Gauge */}
          <div className="learn-results-gauge-wrapper">
            <svg className="learn-results-gauge-svg" viewBox="0 0 120 120" width="110" height="110">
              <circle
                className="gauge-bg"
                cx="60"
                cy="60"
                r="50"
                strokeWidth="9"
                fill="none"
              />
              <circle
                className={`gauge-progress ${
                  accuracyPercent >= 80 ? 'is-high' : accuracyPercent >= 50 ? 'is-mid' : 'is-low'
                }`}
                cx="60"
                cy="60"
                r="50"
                strokeWidth="9"
                fill="none"
                strokeDasharray={2 * Math.PI * 50}
                strokeDashoffset={2 * Math.PI * 50 * (1 - accuracyPercent / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="gauge-center-content">
              <span className="gauge-percent-text">{accuracyPercent}%</span>
              <span className="gauge-label-text">Chính xác</span>
            </div>
          </div>

          {!hasMissed ? (
            <div className="learn-perfect-banner">
              <Sparkles size={20} />
              <span>Xuất sắc! Bạn đã trả lời đúng tất cả các từ ngay từ lần đầu tiên.</span>
            </div>
          ) : (
            <p className="learn-results-subtext">
              Bạn đã hoàn thành phiên luyện tập và ghi nhớ tất cả các thẻ!
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="learn-stats-grid">
          <div className="learn-stat-box">
            <span className="learn-stat-val">{totalCards}</span>
            <span className="learn-stat-lbl">Tổng số từ</span>
          </div>

          <div className="learn-stat-box">
            <span className="learn-stat-val text-success">{firstTryCorrectCount}</span>
            <span className="learn-stat-lbl">Đúng ngay lần đầu</span>
          </div>

          <div className="learn-stat-box">
            <span className="learn-stat-val text-warning">{missedCards.length}</span>
            <span className="learn-stat-lbl">Cần ôn lại</span>
          </div>

          <div className="learn-stat-box">
            <span className="learn-stat-val">{accuracyPercent}%</span>
            <span className="learn-stat-lbl">Độ chính xác</span>
          </div>

          <div className="learn-stat-box">
            <span className="learn-stat-val">{totalAttempts}</span>
            <span className="learn-stat-lbl">Tổng lượt gõ</span>
          </div>

          <div className="learn-stat-box">
            <span className="learn-stat-val">{formattedTime}</span>
            <span className="learn-stat-lbl">Thời gian học</span>
          </div>
        </div>

        {/* Missed Cards Section */}
        {hasMissed && (
          <div className="learn-missed-section">
            <h2 className="learn-missed-title">
              Các từ cần ôn lại ({missedCards.length})
            </h2>
            <div className="learn-missed-list">
              {missedCards.map((stat, idx) => {
                const card = stat.card || stat;
                return (
                  <div key={card.id || stat.cardId || idx} className="learn-missed-item">
                    <div className="learn-missed-content">
                      <span className="learn-missed-term">{card.term}</span>
                      <span className="learn-missed-def">{card.definition}</span>
                    </div>
                    <span className="learn-missed-badge">
                      {stat.wrongCount} lần chưa đúng
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="learn-results-actions">
          {hasMissed && (
            <Button
              variant="primary"
              size="large"
              onClick={onRetryMissed}
              className="learn-action-btn-main"
            >
              <RotateCcw size={18} />
              <span>Luyện lại các từ sai ({missedCards.length})</span>
            </Button>
          )}

          <Button
            variant="secondary"
            size="large"
            onClick={onRetryAll}
            className="learn-action-btn-sub"
          >
            <span>Học lại cả bộ</span>
          </Button>

          <Button
            variant="outline"
            size="large"
            onClick={onExit}
            className="learn-action-btn-back"
          >
            <ArrowLeft size={18} />
            <span>Quay lại bộ từ</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
