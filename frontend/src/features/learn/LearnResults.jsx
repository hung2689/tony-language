import { useMemo } from 'react';
import { RotateCcw, ArrowLeft, Sparkles, Zap, Award } from 'lucide-react';

export default function LearnResults({
  deck,
  items = [],
  stats = {},
  cardStats = {},
  sessionStats = {},
  xpResult = null,
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
    <div className="learn-results-container vintage-learn-container">
      {/* Confetti Celebration Particles */}
      <div className="learn-confetti-layer" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className={`confetti-item confetti-${i % 6}`} />
        ))}
      </div>

      {/* Main Victory Parchment Panel */}
      <div className="vintage-results-parchment-panel">
        <div className="vintage-results-header">
          {/* Ornate Compass Rose Crest */}
          <div className="vintage-results-crest-wrapper">
            <img
              src="/assets/decor_icon/decor_compass_ornate.png"
              alt=""
              className="vintage-results-crest"
            />
          </div>

          <h1 className="vintage-results-title">Cập Bến Thành Công!</h1>

          <div className="vintage-results-deck-ribbon">
            <img
              src="/assets/decor_icon/decor_vocabulary_book.png"
              alt=""
              className="vintage-ribbon-icon"
            />
            <span className="vintage-results-deck-name">{deck?.name || 'Bộ từ vựng'}</span>
          </div>

          {/* SVG Nautical Accuracy Gauge */}
          <div className="vintage-results-gauge-wrapper">
            <svg className="vintage-results-gauge-svg" viewBox="0 0 120 120" width="124" height="124">
              <circle
                className="gauge-bg"
                cx="60"
                cy="60"
                r="50"
                strokeWidth="10"
                fill="none"
              />
              <circle
                className={`gauge-progress ${
                  accuracyPercent >= 80 ? 'is-high' : accuracyPercent >= 50 ? 'is-mid' : 'is-low'
                }`}
                cx="60"
                cy="60"
                r="50"
                strokeWidth="10"
                fill="none"
                strokeDasharray={2 * Math.PI * 50}
                strokeDashoffset={2 * Math.PI * 50 * (1 - accuracyPercent / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="vintage-gauge-center">
              <span className="gauge-percent-text">{accuracyPercent}%</span>
              <span className="gauge-label-text">Chính xác</span>
            </div>
          </div>

          {!hasMissed ? (
            <div className="vintage-perfect-banner">
              <Sparkles size={20} className="vintage-sparkle-icon" />
              <span>Hải trình hoàn hảo! Bạn đã trả lời chính xác tất cả các từ ngay vòng đầu.</span>
            </div>
          ) : (
            <p className="vintage-results-subtext">
              Bạn đã hoàn thành chuyến hải trình và ghi nhớ toàn bộ các thẻ từ vựng!
            </p>
          )}

          {/* XP & Level Up Reward Banner */}
          {xpResult && (
            <div className="vintage-xp-reward-section">
              {xpResult.leveledUp && (
                <div className="vintage-levelup-banner">
                  <Sparkles size={20} className="vintage-sparkle-icon" />
                  <span className="vintage-levelup-text">
                    Thăng cấp {xpResult.level} – {xpResult.tier?.name || 'Nhà Thám Hiểm'}!
                  </span>
                </div>
              )}
              <div className="vintage-xp-pill-container">
                <div className="vintage-xp-gain-chip">
                  <Zap size={16} className="text-amber-500" />
                  <span>+{xpResult.xpGained || 0} XP Thưởng</span>
                </div>
                {xpResult.level && (
                  <div className="vintage-xp-level-chip">
                    <Award size={16} />
                    <span>
                      {xpResult.tier?.name || 'Tập sự'} • Cấp {xpResult.level}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 6 Antique Stat Cards Grid */}
        <div className="vintage-stats-grid">
          <div className="vintage-stat-box">
            <span className="vintage-stat-val">{totalCards}</span>
            <span className="vintage-stat-lbl">Tổng số từ</span>
          </div>

          <div className="vintage-stat-box">
            <span className="vintage-stat-val is-green">{firstTryCorrectCount}</span>
            <span className="vintage-stat-lbl">Đúng vòng đầu</span>
          </div>

          <div className="vintage-stat-box">
            <span className="vintage-stat-val is-red">{missedCards.length}</span>
            <span className="vintage-stat-lbl">Cần rèn luyện</span>
          </div>

          <div className="vintage-stat-box">
            <span className="vintage-stat-val">{accuracyPercent}%</span>
            <span className="vintage-stat-lbl">Độ chính xác</span>
          </div>

          <div className="vintage-stat-box">
            <span className="vintage-stat-val">{totalAttempts}</span>
            <span className="vintage-stat-lbl">Tổng lượt gõ</span>
          </div>

          <div className="vintage-stat-box">
            <span className="vintage-stat-val">{formattedTime}</span>
            <span className="vintage-stat-lbl">Thời gian hải trình</span>
          </div>
        </div>

        {/* Missed Cards Section: Sổ tay ghi chép từ cần ôn lại */}
        {hasMissed && (
          <div className="vintage-missed-section">
            <div className="vintage-missed-header">
              <span className="vintage-missed-icon">📖</span>
              <h2 className="vintage-missed-title">
                Sổ tay từ cần rèn luyện ({missedCards.length})
              </h2>
            </div>
            <div className="vintage-missed-list">
              {missedCards.map((stat, idx) => {
                const card = stat.card || stat;
                return (
                  <div key={card.id || stat.cardId || idx} className="vintage-missed-item">
                    <div className="vintage-missed-content">
                      <span className="vintage-missed-term">{card.term}</span>
                      <span className="vintage-missed-def">{card.definition}</span>
                    </div>
                    <span className="vintage-missed-badge">
                      {stat.wrongCount} lần chưa đúng
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="vintage-results-actions">
          {hasMissed && (
            <button
              type="button"
              onClick={onRetryMissed}
              className="vintage-action-btn-main"
            >
              <RotateCcw size={18} />
              <span>Luyện lại các từ sai ({missedCards.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRetryAll}
            className="vintage-action-btn-sub"
          >
            <span>⟲ Học lại cả bộ</span>
          </button>

          <button
            type="button"
            onClick={onExit}
            className="vintage-action-btn-back"
          >
            <ArrowLeft size={18} />
            <span>Về trang bộ từ</span>
          </button>
        </div>
      </div>
    </div>
  );
}
