import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsService } from '../../services/analyticsService';
import { profileService } from '../../features/profile/profileService';
import { getRankFromLevel } from '../../utils/ranks';
import RankBadge from '../common/RankBadge';
import ProfileDropdown from './ProfileDropdown';

export default function AppHeader({
  user = null,
  onLogout,
  searchQuery = '',
  onSearchChange,
  overview,
}) {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const [streak, setStreak] = useState(() => {
    try {
      const saved = localStorage.getItem('ll_user_streak');
      return saved ? Number(saved) : 7;
    } catch {
      return 7;
    }
  });

  const [profileStats, setProfileStats] = useState(null);

  // Sync overview streak if passed from MainLayout; otherwise fallback fetch once on mount
  useEffect(() => {
    if (overview?.currentStreak !== undefined) {
      setStreak(overview.currentStreak);
      try {
        localStorage.setItem('ll_user_streak', String(overview.currentStreak));
      } catch {}
      return;
    }

    let ignore = false;
    analyticsService
      .getOverview()
      .then((data) => {
        if (!ignore && data?.currentStreak !== undefined) {
          setStreak(data.currentStreak);
          try {
            localStorage.setItem('ll_user_streak', String(data.currentStreak));
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [overview]);

  // Fetch user profile for header Level & XP progress bar
  useEffect(() => {
    let ignore = false;
    profileService
      .getProfile()
      .then((data) => {
        if (!ignore && data) {
          setProfileStats(data);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  // Global Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const displayStreak = streak > 0 ? streak : 7;
  const explorerLevel =
    profileStats?.levelInfo?.level ?? profileStats?.level ?? user?.level ?? 1;
  const rank = getRankFromLevel(explorerLevel);
  const xpIntoLevel =
    profileStats?.levelInfo?.xpIntoLevel ?? profileStats?.xpIntoLevel ?? 0;
  const xpForNext =
    profileStats?.levelInfo?.xpNeededForNextLevel ??
    profileStats?.levelInfo?.xpForNextLevel ??
    profileStats?.xpForNext ??
    80;
  const expPercent = Math.min(
    100,
    Math.max(8, Math.round((xpIntoLevel / Math.max(1, xpForNext)) * 100))
  );

  return (
    <header className="app-topbar lexicon-explorer-header">
      {/* Left: Brand Identity Logo, Wordmark & Tagline */}
      <div className="topbar-brand-container">
        <button
          type="button"
          className="topbar-brand-btn"
          onClick={() => navigate('/')}
          title="Lexicon — Từ vựng nhỏ bé. Hành trình vĩ đại."
        >
          <div className="topbar-brand-icon-box" aria-hidden="true">
            <img
              src="/assets/decor_icon/decor_compass_ornate.png"
              alt=""
              className="topbar-brand-compass-img"
            />
          </div>
          <div className="topbar-brand-text-wrap">
            <span className="topbar-brand-text">Lexicon</span>
            <span className="topbar-brand-tagline">Từ vựng nhỏ bé. Hành trình vĩ đại.</span>
          </div>
        </button>
      </div>

      {/* Center: Wide Parchment Search Bar */}
      <div className="topbar-search-container">
        <div className="topbar-search-input-box">
          <img
            src="/assets/trang_thai_thong_bao/icon_search_magnifier.png"
            alt=""
            className="topbar-search-icon-img"
          />
          <input
            ref={searchInputRef}
            type="text"
            className="topbar-search-input"
            placeholder="Tìm từ vựng, bộ thẻ hoặc địa điểm... (Ctrl + K)"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
          <kbd className="topbar-search-shortcut">Ctrl + K</kbd>
        </div>
      </div>

      {/* Right: Daily Streak, Explorer Level + XP Progress, Notification Bell & User Profile */}
      <div className="topbar-actions-container">
        {/* Daily Streak Indicator */}
        <button
          type="button"
          className="topbar-streak-badge lexicon-header-metric"
          onClick={() => navigate('/analytics')}
          title={`Chuỗi ngày học: ${displayStreak} ngày`}
          aria-label={`Chuỗi ngày học: ${displayStreak} ngày`}
        >
          <img
            src="/assets/trang_thai_thong_bao/icon_daily_streak_flame.png"
            alt=""
            className="lexicon-header-metric-icon"
          />
          <div className="lexicon-header-metric-text">
            <strong className="streak-flame-count">{displayStreak} ngày</strong>
            <span className="lexicon-header-metric-sub">Chuỗi ngày</span>
          </div>
        </button>

        <span className="lexicon-header-divider" aria-hidden="true" />

        {/* Explorer Level & XP Progress */}
        <button
          type="button"
          className="lexicon-header-level-widget"
          onClick={() => navigate('/profile/levels')}
          title={`Cấp độ thám hiểm ${explorerLevel} • ${rank.name} (${xpIntoLevel} / ${xpForNext} XP)`}
        >
          <RankBadge
            level={explorerLevel}
            size="xs"
            className="lexicon-header-rank-badge"
          />
          <div className="lexicon-header-metric-text">
            <strong>Lv. {explorerLevel}</strong>
            <span className="lexicon-header-metric-sub">{rank.name}</span>
          </div>
          <div className="lexicon-header-xp-wrap">
            <div className="lexicon-header-xp-bar">
              <div
                className="lexicon-header-xp-fill"
                style={{ width: `${expPercent}%` }}
              />
            </div>
            <span className="lexicon-header-xp-numbers">
              <strong>{xpIntoLevel}</strong> / {xpForNext} XP
            </span>
          </div>
        </button>

        <span className="lexicon-header-divider" aria-hidden="true" />

        {/* Notification Bell Button */}
        <button
          type="button"
          className="topbar-icon-button lexicon-bell-btn"
          onClick={() => navigate('/study-plan')}
          title="Thông báo & Nhắc nhở học tập"
          aria-label="Thông báo & Nhắc nhở học tập"
        >
          <img
            src="/assets/trang_thai_thong_bao/icon_notifications_bell_badge.png"
            alt=""
            className="lexicon-bell-img"
          />
        </button>

        <span className="lexicon-header-divider" aria-hidden="true" />

        {/* User Profile Trigger & Menu */}
        <ProfileDropdown
          user={{
            ...(user || {}),
            displayName: profileStats?.displayName || user?.displayName,
            avatarUrl: profileStats?.avatarUrl || user?.avatarUrl,
            tierId: profileStats?.tierId || user?.tierId || rank.tierId,
            tierName: profileStats?.tierName || rank.name,
            level: explorerLevel,
          }}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
