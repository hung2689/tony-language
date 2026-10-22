import { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Home,
  GraduationCap,
  Folder,
  Users,
  Trophy,
  Languages,
  Plus,
  Image as ImageIcon,
  MessageSquare,
  ChevronDown,
  LogOut,
  X,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AppSidebar({
  user = null,
  onLogout,
  onCreateDeck,
  isOpenOnMobile = false,
  onCloseMobile,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

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

  // First letter for monochrome avatar
  const displayName = user?.displayName || user?.username || 'Người dùng';
  const initial = (user?.displayName || user?.username || 'U').charAt(0).toUpperCase();

  // Active state: "Đã tạo" is active on root / or /decks/:id
  const isCreatedActive = location.pathname === '/' || location.pathname.startsWith('/decks');

  const handleNavigateLibrary = () => {
    navigate('/');
    if (onCloseMobile) onCloseMobile();
  };

  const handleOpenCreateDeck = () => {
    if (onCreateDeck) onCreateDeck();
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

      <aside className={`reference-sidebar ${isOpenOnMobile ? 'is-open-mobile' : ''}`}>
        {/* 1. Top Brand Logo & App Name */}
        <div className="sidebar-top-brand">
          <div className="sidebar-brand-link" onClick={handleNavigateLibrary} role="button" tabIndex={0}>
            <div className="sidebar-brand-icon-box">
              <BookOpen size={20} strokeWidth={2.3} />
            </div>
            <span className="sidebar-brand-text">Language Learning</span>
          </div>

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

        <div className="sidebar-horizontal-divider" />

        {/* 2. Nav Group 1 */}
        <nav className="sidebar-nav-section" aria-label="Điều hướng chính">
          <button
            type="button"
            className="sidebar-nav-button is-disabled"
            disabled
            aria-disabled="true"
            title="Sắp ra mắt"
          >
            <Home size={19} className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">Trang chủ</span>
            <span className="sidebar-soon-badge">Sắp ra mắt</span>
          </button>

          <button
            type="button"
            className="sidebar-nav-button is-disabled"
            disabled
            aria-disabled="true"
            title="Sắp ra mắt"
          >
            <GraduationCap size={19} className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">Khoá học</span>
            <span className="sidebar-soon-badge">Sắp ra mắt</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-button ${isCreatedActive ? 'is-active' : ''}`}
            onClick={handleNavigateLibrary}
            aria-current={isCreatedActive ? 'page' : undefined}
          >
            <Folder size={19} className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">Đã tạo</span>
          </button>

          <button
            type="button"
            className="sidebar-nav-button is-disabled"
            disabled
            aria-disabled="true"
            title="Sắp ra mắt"
          >
            <Users size={19} className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">Lớp học</span>
            <span className="sidebar-soon-badge">Sắp ra mắt</span>
          </button>

          <button
            type="button"
            className="sidebar-nav-button is-disabled"
            disabled
            aria-disabled="true"
            title="Sắp ra mắt"
          >
            <Trophy size={19} className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">Xếp hạng</span>
            <span className="sidebar-soon-badge">Sắp ra mắt</span>
          </button>
        </nav>

        {/* 3. Flexible empty space */}
        <div className="sidebar-spacer" />

        <div className="sidebar-horizontal-divider" />

        {/* 4. Action Group */}
        <div className="sidebar-action-group">
          <button
            type="button"
            className="sidebar-btn-black-pill is-disabled"
            disabled
            aria-disabled="true"
            title="Sắp ra mắt"
          >
            <Languages size={17} />
            <span>Tra từ</span>
          </button>

          <button
            type="button"
            className="sidebar-btn-outlined"
            onClick={handleOpenCreateDeck}
            title="Tạo bộ từ vựng mới"
          >
            <Plus size={17} />
            <span>+ Tạo Bộ thẻ</span>
          </button>

          <button
            type="button"
            className="sidebar-btn-outlined is-disabled"
            disabled
            aria-disabled="true"
            title="Sắp ra mắt"
          >
            <BookOpen size={16} />
            <span>Tạo lộ trình</span>
          </button>
        </div>

        <div className="sidebar-horizontal-divider" />

        {/* 5. Utility Links */}
        <div className="sidebar-utility-links">
          <button
            type="button"
            className="sidebar-nav-button is-disabled"
            disabled
            aria-disabled="true"
            title="Sắp ra mắt"
          >
            <ImageIcon size={18} className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">Hình nền</span>
            <span className="sidebar-soon-badge">Sắp ra mắt</span>
          </button>

          <button
            type="button"
            className="sidebar-nav-button is-disabled"
            disabled
            aria-disabled="true"
            title="Sắp ra mắt"
          >
            <MessageSquare size={18} className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">Báo lỗi</span>
            <span className="sidebar-soon-badge">Sắp ra mắt</span>
          </button>
        </div>

        <div className="sidebar-horizontal-divider" />

        {/* 6. Bottom User Block with Dropdown */}
        <div className="sidebar-user-block" ref={userMenuRef}>
          <button
            type="button"
            className="sidebar-user-trigger"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
          >
            <div className="sidebar-user-avatar">
              <span>{initial}</span>
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{displayName}</span>
            </div>
            <ChevronDown size={16} className={`sidebar-chevron ${isUserMenuOpen ? 'is-rotated' : ''}`} />
          </button>

          {isUserMenuOpen && (
            <div className="sidebar-user-dropdown" role="menu">
              <div className="sidebar-dropdown-header">
                <p className="sidebar-dropdown-name">{displayName}</p>
                <p className="sidebar-dropdown-email">{user?.email || ''}</p>
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
      </aside>
    </>
  );
}
