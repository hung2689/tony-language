import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { BorderBeam } from '@/registry/magicui/border-beam';
import { cn } from '@/lib/utils';

export function ProfileDropdown({
  user = null,
  onLogout,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const displayName = user?.displayName || user?.username || 'tony';
  const email = user?.email || 'tony@example.com';
  const initial = (user?.displayName || user?.username || 'T').charAt(0).toUpperCase();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className={cn('topbar-user-block relative', className)} ref={containerRef}>
      {/* Profile Dropdown Trigger Button with BorderBeam */}
      <button
        type="button"
        className="topbar-user-trigger relative overflow-hidden rounded-full"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={displayName}
      >
        {/* Avatar */}
        <div className="topbar-user-avatar">
          <span>{initial}</span>
        </div>

        {/* Username */}
        <span className="topbar-user-name desktop-only">{displayName}</span>

        {/* Chevron icon */}
        <ChevronDown
          size={14}
          className={`topbar-chevron ${isOpen ? 'is-rotated' : ''}`}
        />

        {/* Magic UI Animated BorderBeam traveling continuously around the pill border */}
        <BorderBeam duration={8} size={100} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="topbar-user-dropdown" role="menu" aria-orientation="vertical">
          <div className="topbar-dropdown-header">
            <p className="topbar-dropdown-name">{displayName}</p>
            <p className="topbar-dropdown-email">{email}</p>
          </div>
          <div className="topbar-dropdown-divider" />
          <button
            type="button"
            className="topbar-dropdown-item topbar-logout-btn"
            onClick={() => {
              setIsOpen(false);
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
  );
}

export default ProfileDropdown;
