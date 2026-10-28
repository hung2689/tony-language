import React, { memo, useState } from 'react';
import { Award, Lock } from 'lucide-react';
import { getRankFromLevel, getRankByTier } from '../../utils/ranks';
import './RankBadge.css';

/**
 * RankBadge: Reusable component to display the authentic Lexicon student rank badge.
 *
 * Automatically resolves the correct 8-tier badge PNG from user's level.
 *
 * @param {object} props
 * @param {number|string} [props.level] - Student level (1..100)
 * @param {object} [props.rank] - Optional precomputed rank object (overrides level)
 * @param {string|number} [props.tierId] - Optional tier identifier fallback
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|string|number} [props.size='md'] - Badge size
 * @param {boolean} [props.showName=false] - Whether to render HTML rank name text
 * @param {boolean} [props.showLevel=false] - Whether to render HTML level text
 * @param {boolean} [props.locked=false] - Whether this rank is locked for current user
 * @param {boolean} [props.animated=true] - Whether to enable subtle hover/shine animations
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {string} [props.title] - Accessible title/tooltip
 * @param {string} [props.alt] - Image alt text
 * @param {function} [props.onClick] - Click handler
 */
const RankBadge = memo(function RankBadge({
  level,
  rank: customRank,
  tierId,
  size = 'md',
  showName = false,
  showLevel = false,
  locked = false,
  animated = true,
  className = '',
  title,
  alt,
  onClick,
}) {
  const [imgError, setImgError] = useState(false);

  // 1. Resolve Rank from customRank, level, or tierId
  const rank =
    customRank ||
    (level !== undefined && level !== null ? getRankFromLevel(level) : null) ||
    (tierId ? getRankByTier(tierId) : getRankFromLevel(1));

  const resolvedLevel =
    level !== undefined && level !== null && level !== '' ? level : rank.minLevel;

  const defaultTitle = `Huy hiệu ${rank.name} (Cấp ${rank.minLevel}–${rank.maxLevel})`;
  const defaultAlt = `Huy hiệu ${rank.name}`;

  // Standard predefined size classes
  const isPredefinedSize = ['xs', 'sm', 'md', 'lg', 'xl'].includes(size);
  const sizeClass = isPredefinedSize ? `rank-badge-size-${size}` : '';
  const inlineStyle = !isPredefinedSize && size
    ? {
        '--rank-badge-custom-size': typeof size === 'number' ? `${size}px` : size,
      }
    : undefined;

  return (
    <div
      className={`rank-badge-wrapper ${sizeClass} ${
        locked ? 'is-locked' : 'is-unlocked'
      } ${animated ? 'is-animated' : ''} ${className}`}
      style={inlineStyle}
      title={title || defaultTitle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="rank-badge-container">
        {!imgError ? (
          <img
            src={rank.badgeSrc}
            alt={alt || defaultAlt}
            className="rank-badge-image"
            loading="lazy"
            onError={() => setImgError(true)}
            draggable="false"
          />
        ) : (
          <div className="rank-badge-fallback" style={{ borderColor: rank.color }}>
            <Award size={20} style={{ color: rank.color }} />
          </div>
        )}

        {/* Lock Overlay when locked */}
        {locked && (
          <div className="rank-badge-lock-overlay" aria-hidden="true">
            <Lock size={size === 'xs' ? 10 : size === 'sm' ? 12 : 16} />
          </div>
        )}
      </div>

      {/* Optional HTML Text Elements */}
      {(showName || showLevel) && (
        <div className="rank-badge-meta">
          {showName && <span className="rank-badge-name">{rank.name}</span>}
          {showLevel && <span className="rank-badge-level">Cấp {resolvedLevel}</span>}
        </div>
      )}
    </div>
  );
});

export default RankBadge;
