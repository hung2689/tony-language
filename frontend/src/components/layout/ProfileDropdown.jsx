import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { BorderBeam } from '@/registry/magicui/border-beam';
import { cn } from '@/lib/utils';
import AvatarFrame from '../common/AvatarFrame';
import RankBadge from '../common/RankBadge';

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
        {/* Avatar with Student Tier Frame */}
        <div className="topbar-user-avatar-frame-wrap">
          <AvatarFrame
            size="sm"
            tierId={user?.tierId || 1}
            src={user?.avatarUrl || '/assets/trang_thai_thong_bao/avatar_anime_explorer.png'}
            name={displayName}
          />
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
            <div className="flex items-center justify-between gap-2">
              <p className="topbar-dropdown-name">{displayName}</p>
              {user?.tierName && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                  <RankBadge level={user.level || 1} size="xs" />
                  <span>{user.tierName} • Cấp {user.level || 1}</span>
                </span>
              )}
            </div>
            <p className="topbar-dropdown-email">{email}</p>
          </div>
          <div className="topbar-dropdown-divider" />

          {/* Profile Navigation Option */}
          <Link
            to="/profile"
            className="topbar-dropdown-item"
            onClick={() => setIsOpen(false)}
            role="menuitem"
          >
            <User size={16} />
            <span>Hồ sơ</span>
          </Link>

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
