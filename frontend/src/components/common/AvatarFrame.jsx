import { memo } from 'react';
import './AvatarFrame.css';

const TIER_STRING_MAP = {
  TIER_1_NOVICE: 1,
  TIER_2_BRONZE: 2,
  TIER_3_SILVER: 3,
  TIER_4_GOLD: 4,
  TIER_5_PLATINUM: 5,
  TIER_6_DIAMOND: 6,
  TIER_7_LEGEND: 7,
  TIER_8_MYTHIC: 8,
};

function parseTierNumber(val) {
  if (typeof val === 'number') {
    return Math.max(1, Math.min(8, Math.floor(val)));
  }
  if (typeof val === 'string') {
    if (TIER_STRING_MAP[val]) {
      return TIER_STRING_MAP[val];
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      return Math.max(1, Math.min(8, parsed));
    }
  }
  return 1;
}

/**
 * AvatarFrame: Displays user avatar with an authentic student tier frame.
 * @param {string} size - 'sm' (32px), 'md' (40px), 'lg' (60px), 'xl' (100px)
 * @param {number|string} tierId - 1 to 8 or 'TIER_1_NOVICE' to 'TIER_8_MYTHIC'
 * @param {string} src - Avatar image URL (if present)
 * @param {string} name - User's display name or username for fallback initials & alt text
 * @param {boolean} animated - Whether dynamic animations are enabled (defaults to true)
 * @param {string} className - Optional additional CSS class
 */
const AvatarFrame = memo(function AvatarFrame({
  size = 'md',
  tierId = 1,
  src = null,
  name = 'User',
  animated = true,
  className = '',
}) {
  const safeTierId = parseTierNumber(tierId);

  // Compute initials fallback (up to 2 letters)
  const getInitials = (str) => {
    if (!str || typeof str !== 'string') return 'U';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  // User preference or setting toggle
  const isAnimationActive = Boolean(animated);

  return (
    <div
      className={`avatar-frame-root size-${size} tier-${safeTierId} ${
        isAnimationActive ? 'is-animated' : 'is-static'
      } ${className}`}
    >
      {/* 1. Tier 8 Crown Decoration */}
      {safeTierId === 8 && (
        <div className="tier-8-crown-badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" className="crown-svg">
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
          </svg>
        </div>
      )}

      {/* 2. Decorative Outer Frame (aria-hidden) */}
      <div className="avatar-frame-border" aria-hidden="true" />

      {/* 3. Inner Avatar Content */}
      <div className="avatar-frame-inner">
        {src ? (
          <img
            src={src}
            alt={`Ảnh đại diện của ${name}`}
            className="avatar-frame-image"
            loading="lazy"
            onError={(e) => {
              // Hide broken image and fall back gracefully to initials
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fallback = parent.querySelector('.avatar-frame-initials');
                if (fallback) fallback.style.display = 'flex';
              }
            }}
          />
        ) : null}

        <div
          className="avatar-frame-initials"
          style={{ display: src ? 'none' : 'flex' }}
          aria-label={name}
        >
          {initials}
        </div>
      </div>
    </div>
  );
});

export default AvatarFrame;
