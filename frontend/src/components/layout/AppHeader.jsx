import { useRef, useEffect } from 'react';
import { Search, Bell, Menu } from 'lucide-react';

export default function AppHeader({
  searchQuery = '',
  onSearchChange,
  onToggleMobileSidebar,
}) {
  const searchInputRef = useRef(null);

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
      {/* Mobile Drawer Toggle */}
      <button
        type="button"
        className="topbar-mobile-menu-btn"
        onClick={onToggleMobileSidebar}
        aria-label="Mở thanh điều hướng"
      >
        <Menu size={20} />
      </button>

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

      {/* Right: Notification Bell */}
      <div className="topbar-actions-container">
        <button
          type="button"
          className="topbar-icon-button"
          title="Thông báo"
          aria-label="Thông báo"
        >
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
