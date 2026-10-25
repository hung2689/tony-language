import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Sun, Moon, Flame } from 'lucide-react';
import { useTheme } from '../../features/theme/ThemeContext';
import { analyticsService } from '../../services/analyticsService';
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
  const { isDark, toggleTheme } = useTheme();

  const [streak, setStreak] = useState(() => {
    try {
      const saved = localStorage.getItem('ll_user_streak');
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });

  // Use overview if passed from MainLayout; otherwise fallback fetch once on mount (BUG-08)
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

  return (
    <header className="app-topbar">
      {/* Left: Brand Identity Logo & Name */}
      <div className="topbar-brand-container">
        <button
          type="button"
          className="topbar-brand-btn"
          onClick={() => navigate('/')}
          title="Về trang chủ LEXICON"
        >
          <div className="topbar-brand-icon-box" aria-hidden="true">
            <span className="brand-gem-symbol">✦</span>
          </div>
          <div className="topbar-brand-text-wrap">
            <span className="topbar-brand-text">LEXICON</span>
            <span className="topbar-brand-tagline">INTELLIGENT LEARNING</span>
          </div>
        </button>
      </div>

      {/* Center: Global Search Bar */}
      <div className="topbar-search-container">
        <div className="topbar-search-input-box">
          <Search size={16} className="topbar-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="topbar-search-input"
            placeholder="Tìm kiếm bộ từ vựng... (Ctrl + K)"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
          <kbd className="topbar-search-shortcut">Ctrl + K</kbd>
        </div>
      </div>

      {/* Right: Streak Badge, Theme Toggle, Notification Bell & User Profile */}
      <div className="topbar-actions-container">
        <button
          type="button"
          className="topbar-streak-badge"
          onClick={() => navigate('/analytics')}
          title={`Chuỗi học tập: ${streak} ngày liên tục. Bấm để xem thống kê!`}
          aria-label={`Chuỗi học: ${streak} ngày`}
        >
          <Flame size={16} className="streak-flame-icon" />
          <span className="streak-flame-count">{streak}</span>
        </button>

        <button
          type="button"
          className="topbar-icon-button"
          onClick={toggleTheme}
          title={isDark ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối (Dark Mode)'}
          aria-label={isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          type="button"
          className="topbar-icon-button"
          title="Thông báo"
          aria-label="Thông báo"
        >
          <Bell size={18} />
        </button>

        {/* User Profile Trigger & Menu with Magic UI BorderBeam */}
        <ProfileDropdown user={user} onLogout={onLogout} />
      </div>
    </header>
  );
}
