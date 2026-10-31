import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Trophy,
  CheckCircle2,
  Target,
  BookOpen,
  BarChart3,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Compass,
  Star,
  Zap,
  Crown,
  Rocket,
} from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import ActivityHeatmap from './ActivityHeatmap';
import RetentionDistribution from './RetentionDistribution';
import WeakWordsList from './WeakWordsList';
import Ripple from '../../components/common/Ripple';
import './Analytics.css';

export default function AnalyticsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [overview, setOverview] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [retentionData, setRetentionData] = useState(null);
  const [weakWords, setWeakWords] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async (year) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [overviewRes, heatmapRes, retentionRes, weakRes] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getHeatmap({ year }),
        analyticsService.getRetention(),
        analyticsService.getWeakWords(10),
      ]);

      setOverview(overviewRes || null);
      setHeatmapData(heatmapRes || null);
      setRetentionData(retentionRes || null);
      setWeakWords(weakRes || []);
    } catch (err) {
      setErrorMsg(err.message || 'Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(currentYear);
  }, [loadData, currentYear]);

  const handleYearChange = (newYear) => {
    setCurrentYear(newYear);
  };

  // Scoped class on body: hides modern wallpaper and bottom dock, applies parchment background
  useEffect(() => {
    document.body.classList.add('rpg-library-active');
    document.body.classList.add('analytics-vintage-active');
    return () => {
      document.body.classList.remove('rpg-library-active');
      document.body.classList.remove('analytics-vintage-active');
    };
  }, []);

  const handlePracticeWeakWords = () => {
    if (weakWords.length === 0) return;
    const practiceCards = weakWords.map((w) => ({
      id: w.vocabularyId,
      term: w.word,
      definition: w.meaning,
      pronunciation: '',
      partOfSpeech: '',
      example: '',
      synonyms: [],
    }));
    sessionStorage.setItem('weak_practice_cards', JSON.stringify(practiceCards));
    navigate('/analytics/practice');
  };

  // Gamification Tier & Badges
  const streakCount = overview?.currentStreak || 0;
  const questionsCount = overview?.totalQuestions || 0;
  const accuracyRate = overview?.overallAccuracy || 0;
  const masteredCount = retentionData?.mastered || 0;

  const learnerTier = useMemo(() => {
    if (streakCount >= 14 || questionsCount >= 300) {
      return {
        name: 'Đa Ngôn Ngữ Huyền Thoại',
        level: 'Cấp 4',
        badge: '💎',
        color: '#6366f1',
        nextMilestone: 'Bạn đã đạt cấp độ học viên cao nhất!',
      };
    }
    if (streakCount >= 7 || questionsCount >= 100) {
      return {
        name: 'Cao Thủ Trí Nhớ',
        level: 'Cấp 3',
        badge: '🥇',
        color: '#f59e0b',
        nextMilestone: 'Mục tiêu: Đạt streak 14 ngày hoặc 300 câu để lên Cấp 4',
      };
    }
    if (streakCount >= 3 || questionsCount >= 30) {
      return {
        name: 'Nhà Thám Hiểm',
        level: 'Cấp 2',
        badge: '🥈',
        color: '#3b82f6',
        nextMilestone: 'Mục tiêu: Đạt streak 7 ngày hoặc 100 câu để lên Cấp 3',
      };
    }
    return {
      name: 'Người Khởi Đầu',
      level: 'Cấp 1',
      badge: '🥉',
      color: '#10b981',
      nextMilestone: 'Mục tiêu: Đạt streak 3 ngày hoặc 30 câu để lên Cấp 2',
    };
  }, [streakCount, questionsCount]);

  const achievements = useMemo(() => {
    return [
      {
        id: 'first_step',
        title: 'Bước Chân Đầu Tiên',
        desc: 'Làm câu hỏi luyện tập đầu tiên',
        IconComponent: Star,
        fill: true,
        bgColor: '#fef3c7',
        color: '#d97706',
        unlocked: questionsCount >= 1,
        progressType: 'done',
      },
      {
        id: 'streak_3',
        title: 'Giữ Lửa 3 Ngày',
        desc: 'Học tập liên tục 3 ngày',
        IconComponent: Flame,
        fill: true,
        bgColor: '#ffedd5',
        color: '#ea580c',
        unlocked: streakCount >= 3,
        progressType: 'done',
      },
      {
        id: 'streak_7',
        title: 'Chiến Binh Kiên Trì',
        desc: 'Học tập liên tục 7 ngày',
        IconComponent: Zap,
        fill: true,
        bgColor: '#f3e8ff',
        color: '#9333ea',
        unlocked: streakCount >= 7,
        progressType: 'done',
      },
      {
        id: 'vocab_50',
        title: 'Thợ Săn Từ Vựng',
        desc: 'Trả lời đúng 50 câu hỏi',
        IconComponent: Target,
        fill: false,
        bgColor: '#fce7f3',
        color: '#db2777',
        unlocked: (overview?.correctQuestions || 0) >= 50,
        progressType: 'done',
      },
      {
        id: 'accuracy_80',
        title: 'Bậc Thầy Ghi Nhớ',
        desc: 'Đạt độ chính xác trên 80%',
        IconComponent: Crown,
        fill: true,
        bgColor: '#e0f2fe',
        color: '#0284c7',
        unlocked: accuracyRate >= 80 && questionsCount >= 10,
        progressType: 'bar',
        progressText: `${accuracyRate}% / 80%`,
        percent: Math.min(100, Math.round((accuracyRate / 80) * 100)),
      },
      {
        id: 'mastered_word',
        title: 'Chiến Thần SM-2',
        desc: 'Đưa từ vựng vào độ chín thành thạo',
        IconComponent: Rocket,
        fill: false,
        bgColor: '#ede9fe',
        color: '#6366f1',
        unlocked: masteredCount >= 1,
        progressType: 'pill',
        progressText: `${masteredCount}/1`,
      },
    ];
  }, [questionsCount, streakCount, overview?.correctQuestions, accuracyRate, masteredCount]);

  if (loading && !overview) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading-state">
          <Ripple size={48} color="#C49856" />
          <span>Đang khai mở cuốn sử ký hải hành...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* Top Header Plaque (Antique Parchment & Brass Double Border) */}
      <div className="analytics-header-plaque">
        <div className="analytics-header-title-group">
          <h1>
            <BarChart3 size={24} className="analytics-header-icon" />
            <span>Sử Ký & Bảng Thành Tích Hải Hành</span>
          </h1>
          <p className="analytics-header-subtitle">
            Tổng hợp tiến trình thám hiểm, nhật ký học tập và chuỗi ngày rèn luyện
          </p>
        </div>

        <div className="analytics-header-actions">
          <button
            type="button"
            className="btn-analytics-nav"
            onClick={() => navigate('/library')}
            title="Quay lại Thư viện bộ từ"
          >
            <ArrowLeft size={15} />
            <span>Thư viện</span>
          </button>
          <button
            type="button"
            className="btn-analytics-nav"
            onClick={() => navigate('/study-plan')}
            title="Xem Hải trình ôn tập"
          >
            <Compass size={15} />
            <span>Hải trình</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="analytics-error-banner">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => loadData(currentYear)}
            className="btn-analytics-retry"
          >
            <RefreshCw size={14} /> Thử lại
          </button>
        </div>
      )}

      {/* 1. Hero Learner Tier Banner (matching reference screenshot) */}
      <div className="analytics-hero-banner">
        {/* Subtle decorative mountain vector artwork */}
        <div className="hero-banner-art" aria-hidden="true">
          <svg viewBox="0 0 520 120" preserveAspectRatio="none" className="hero-banner-mountain-svg">
            {/* Background mountain ridge */}
            <polygon points="140,120 230,60 310,120" fill="rgba(147, 197, 253, 0.35)" />
            <polygon points="260,120 360,32 440,120" fill="rgba(165, 180, 252, 0.45)" />
            <polygon points="400,120 465,55 520,120" fill="rgba(196, 181, 253, 0.35)" />

            {/* Main summit peak with faceted light and shadow */}
            <polygon points="265,120 370,16 370,120" fill="rgba(96, 165, 250, 0.65)" />
            <polygon points="370,16 455,120 370,120" fill="rgba(79, 70, 229, 0.55)" />

            {/* Foreground secondary ridge */}
            <polygon points="190,120 280,68 345,120" fill="rgba(129, 140, 248, 0.4)" />
            <polygon points="335,120 405,72 490,120" fill="rgba(99, 102, 241, 0.35)" />

            {/* Summit Flagpole & Flag */}
            <line x1="370" y1="16" x2="370" y2="3" stroke="#3730a3" strokeWidth="2" strokeLinecap="round" />
            <polygon points="370,3 392,8 370,14" fill="#4338ca" />

            {/* Faint stylized clouds */}
            <path d="M 220 78 Q 240 70 265 78 Q 290 86 315 78" stroke="rgba(255,255,255,0.75)" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 425 42 Q 445 35 465 42" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        {/* Left Side: Diamond Squircle, Tier Level, Title & Milestone */}
        <div className="hero-banner-left">
          <div className="hero-tier-squircle" title={learnerTier.name}>
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 4L8 14L20 36L32 14L20 4Z" fill="#1e1b4b" opacity="0.3"/>
              <path d="M20 4L12 14H28L20 4Z" fill="#67e8f9"/>
              <path d="M8 14L12 14L20 4L8 14Z" fill="#38bdf8"/>
              <path d="M32 14L28 14L20 4L32 14Z" fill="#0284c7"/>
              <path d="M12 14L20 36L20 14H12Z" fill="#0ea5e9"/>
              <path d="M28 14L20 36L20 14H28Z" fill="#0369a1"/>
              <path d="M8 14L20 36L12 14H8Z" fill="#0284c7"/>
              <path d="M32 14L20 36L28 14H32Z" fill="#075985"/>
              <path d="M16 9L20 4L24 9H16Z" fill="#cffafe" opacity="0.8"/>
            </svg>
          </div>

          <div className="hero-tier-details">
            <div className="hero-tier-title-row">
              <span className="hero-tier-pill">{learnerTier.level}</span>
              <h2 className="hero-tier-heading">{learnerTier.name}</h2>
            </div>
            <p className="hero-tier-sub">
              <Sparkles size={14} className="hero-sparkle-icon" />
              <span>{learnerTier.nextMilestone}</span>
            </p>
          </div>
        </div>

        {/* Right Side: Dark Streak Button with Chevron */}
        <div className="hero-banner-right">
          <button
            type="button"
            className="hero-streak-pill"
            onClick={() => {}}
            title={`Chuỗi học tập hiện tại: ${streakCount} ngày liên tục`}
          >
            <Flame size={22} className="hero-streak-flame" />
            <div className="hero-streak-text">
              <span className="hero-streak-num">{streakCount}</span>
              <span className="hero-streak-label">NGÀY STREAK</span>
            </div>
            <ChevronRight size={16} className="hero-streak-chevron" />
          </button>
        </div>
      </div>

      {/* 2. Huy hiệu thành tích (4/6) - 3 Columns Grid with "Xem tất cả ->" */}
      <div className="achievements-card-container">
        <div className="achievements-card-header">
          <div className="achievements-card-title">
            <Trophy size={20} className="achievements-trophy-icon" />
            <span>Huy hiệu thành tích ({achievements.filter((a) => a.unlocked).length}/{achievements.length})</span>
          </div>
          <button
            type="button"
            className="achievements-view-all-btn"
            onClick={() => {}}
          >
            <span>Xem tất cả</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="achievements-cards-grid">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`achievement-tile ${ach.unlocked ? 'is-unlocked' : 'is-in-progress'}`}
            >
              {/* Left Circle Icon */}
              <div
                className="achievement-tile-icon-circle"
                style={{ backgroundColor: ach.bgColor, color: ach.color }}
              >
                <ach.IconComponent
                  size={20}
                  fill={ach.fill ? 'currentColor' : 'none'}
                  strokeWidth={ach.fill ? 1.5 : 2.2}
                />
              </div>

              {/* Middle Info */}
              <div className="achievement-tile-content">
                <h4 className="achievement-tile-name">{ach.title}</h4>
                <p className="achievement-tile-desc">{ach.desc}</p>

                {ach.unlocked ? (
                  <span className="achievement-status-tag is-unlocked">
                    <span>✓</span>
                    <span>Đã đạt</span>
                  </span>
                ) : ach.progressType === 'bar' ? (
                  <div className="achievement-progress-bar-wrap">
                    <span className="achievement-bar-label">{ach.progressText}</span>
                    <div className="achievement-bar-track">
                      <div
                        className="achievement-bar-fill"
                        style={{ width: `${ach.percent || 0}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <span className="achievement-status-tag is-pill">
                    <span>🎯</span>
                    <span>{ach.progressText}</span>
                  </span>
                )}
              </div>

              {/* Right Chevron */}
              <div className="achievement-tile-arrow">
                <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Two Side-by-Side Columns: Biểu đồ hoạt động (Left) + Phân bổ ghi nhớ SM-2 (Right) */}
      <div className="analytics-two-columns">
        {/* Left Column: Biểu đồ hoạt động (Heatmap) */}
        <ActivityHeatmap
          heatmapData={heatmapData}
          currentYear={currentYear}
          onYearChange={handleYearChange}
        />

        {/* Right Column: Phân bổ mức độ ghi nhớ (SM-2 Retention) */}
        <RetentionDistribution data={retentionData} />
      </div>

      {/* 4. Weak Words Section (Top từ hay trả lời sai nhất) */}
      <WeakWordsList
        weakWords={weakWords}
        onPractice={handlePracticeWeakWords}
      />
    </div>
  );
}
