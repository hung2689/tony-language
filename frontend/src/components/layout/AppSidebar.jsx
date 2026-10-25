import { useState, useRef, useEffect } from 'react';
import {
  Home,
  BookOpen,
  Sparkles,
  BarChart3,
  GraduationCap,
  Settings,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  LogOut,
  X,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallpaper } from '../../features/wallpapers/WallpaperContext';
import { useStudyPlan } from '../../features/studyplan/StudyPlanContext';

export default function AppSidebar({
  user = null,
  onLogout,
  onCreateDeck,
  isOpenOnMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { openWallpaperModal } = useWallpaper();
  const { activePlan, openCreateModal } = useStudyPlan();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const handleStudyPlanClick = () => {
    if (activePlan) {
      navigate('/study-plan');
    } else {
      openCreateModal();
    }
    if (onCloseMobile) onCloseMobile();
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Display name & avatar initial
  const displayName = user?.displayName || user?.username || 'tony';
  const initial = (user?.displayName || user?.username || 'T').charAt(0).toUpperCase();

  // Active state matching the reference screenshot
  const isHomeActive = location.pathname === '/';
  const isStudyPlanActive = location.pathname.startsWith('/study-plan');
  const isAnalyticsActive = location.pathname.startsWith('/analytics');

  const handleNavigateHome = () => {
    navigate('/');
    if (onCloseMobile) onCloseMobile();
  };

  const handleNavigateAnalytics = () => {
    navigate('/analytics');
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenOnMobile && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`reference-sidebar ${isOpenOnMobile ? 'is-open-mobile' : ''} ${
          isCollapsed ? 'is-collapsed' : ''
        }`}
      >
        {/* Top Header Section */}
        <div className="sidebar-top-section">
          <div className="sidebar-top-brand">
            <div className="sidebar-brand-link" onClick={handleNavigateHome} role="button" tabIndex={0}>
              <div className="sidebar-brand-icon-box" title="LEXICON">
                <span className="brand-gem-symbol">✦</span>
              </div>
              {!isCollapsed && (
                <div className="sidebar-brand-text-wrap">
                  <span className="sidebar-brand-text">LEXICON</span>
                  <span className="sidebar-brand-tagline">INTELLIGENT LEARNING</span>
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle Button */}
            {onToggleCollapse && (
              <button
                type="button"
                className="sidebar-collapse-btn desktop-only"
                onClick={onToggleCollapse}
                title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
                aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
              >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            )}

            {/* Close button on mobile */}
            <button
              type="button"
              className="sidebar-mobile-close-btn"
              onClick={onCloseMobile}
              aria-label="Đóng thanh điều hướng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Section (Scrollable if needed) */}
        <div className="sidebar-scrollable-content">
          {/* Primary Nav Items */}
          <nav className="sidebar-nav-section" aria-label="Điều hướng chính">
            <button
              type="button"
              className={`sidebar-nav-button ${isHomeActive ? 'is-active' : ''}`}
              onClick={handleNavigateHome}
              aria-current={isHomeActive ? 'page' : undefined}
              title="Trang chủ"
            >
              <Home size={18} className="sidebar-nav-icon" />
              {!isCollapsed && <span className="sidebar-nav-label">Trang chủ</span>}
            </button>

            <button
              type="button"
              className="sidebar-nav-button"
              onClick={handleNavigateHome}
              title="Thư viện bộ thẻ"
            >
              <BookOpen size={18} className="sidebar-nav-icon" />
              {!isCollapsed && (
                <>
                  <span className="sidebar-nav-label">Thư viện bộ thẻ</span>
                  <span className="sidebar-dot-indicator" title="Sẵn sàng học" />
                </>
              )}
            </button>

            <button
              type="button"
              className={`sidebar-nav-button ${isStudyPlanActive ? 'is-active' : ''}`}
              onClick={handleStudyPlanClick}
              aria-current={isStudyPlanActive ? 'page' : undefined}
              title="Lộ trình học lặp lại ngắt quãng (SM-2)"
            >
              <Sparkles size={18} className="sidebar-nav-icon" />
              {!isCollapsed && <span className="sidebar-nav-label">Lộ trình SM-2</span>}
            </button>

            <button
              type="button"
              className={`sidebar-nav-button ${isAnalyticsActive ? 'is-active' : ''}`}
              onClick={handleNavigateAnalytics}
              aria-current={isAnalyticsActive ? 'page' : undefined}
              title="Thống kê học tập & Huy hiệu"
            >
              <BarChart3 size={18} className="sidebar-nav-icon" />
              {!isCollapsed && <span className="sidebar-nav-label">Thống kê & Huy hiệu</span>}
            </button>

            <button
              type="button"
              className="sidebar-nav-button"
              onClick={openWallpaperModal}
              title="Không gian học & Hình nền"
            >
              <GraduationCap size={18} className="sidebar-nav-icon" />
              {!isCollapsed && <span className="sidebar-nav-label">Không gian học</span>}
            </button>
          </nav>

          {/* Section: CÀI ĐẶT & KHÁC */}
          {!isCollapsed && (
            <div className="sidebar-section-heading">
              CÀI ĐẶT & KHÁC
            </div>
          )}

          <nav className="sidebar-nav-section" aria-label="Cài đặt và trợ giúp">
            <button
              type="button"
              className="sidebar-nav-button"
              onClick={() => alert('Cài đặt hệ thống')}
              title="Cài đặt"
            >
              <Settings size={18} className="sidebar-nav-icon" />
              {!isCollapsed && <span className="sidebar-nav-label">Cài đặt</span>}
            </button>

            <button
              type="button"
              className="sidebar-nav-button"
              onClick={() => alert('Trung tâm trợ giúp LEXICON')}
              title="Trợ giúp"
            >
              <HelpCircle size={18} className="sidebar-nav-icon" />
              {!isCollapsed && <span className="sidebar-nav-label">Trợ giúp</span>}
            </button>
          </nav>

          {/* Motivational Learning Card */}
          {!isCollapsed && (
            <div className="sidebar-motivation-card">
              <div className="motivation-card-content">
                <h4 className="motivation-card-title">
                  Học mỗi ngày,<br />tiến bộ mỗi ngày
                </h4>
                <p className="motivation-card-subtitle">
                  LEXICON luôn đồng hành cùng bạn.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section: User Profile Area */}
        <div className="sidebar-bottom-section">
          <div className="sidebar-user-block" ref={userMenuRef}>
            <button
              type="button"
              className="sidebar-user-trigger"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
              title={displayName}
            >
              <div className="sidebar-user-avatar">
                <span>{initial}</span>
              </div>
              {!isCollapsed && (
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{displayName}</span>
                  <span className="sidebar-user-role">Học viên</span>
                </div>
              )}
              {!isCollapsed && (
                <ChevronRight size={16} className={`sidebar-chevron ${isUserMenuOpen ? 'is-rotated' : ''}`} />
              )}
            </button>

            {isUserMenuOpen && (
              <div className="sidebar-user-dropdown" role="menu">
                <div className="sidebar-dropdown-header">
                  <p className="sidebar-dropdown-name">{displayName}</p>
                  <p className="sidebar-dropdown-email">{user?.email || 'tony@example.com'}</p>
                </div>
                <div className="sidebar-dropdown-divider" />
                <button
                  type="button"
                  className="sidebar-dropdown-item sidebar-logout-btn"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                  role="menuitem"
                >
                  <LogOut size={16} />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
