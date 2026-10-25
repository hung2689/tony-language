import React, {
  useState,
  useRef,
  useCallback,
  createContext,
  useContext,
  useMemo,
} from 'react';
import './Dock.css';

const DockContext = createContext({
  mouseX: null,
  magnification: 68,
  distance: 140,
  baseSize: 44,
});

/**
 * MagicUI macOS-style Dock Container.
 * Tracks mouse position and calculates smooth Gaussian magnification.
 */
export function Dock({
  children,
  className = '',
  magnification = 68,
  distance = 140,
  baseSize = 44,
  direction = 'bottom',
}) {
  const [mouseX, setMouseX] = useState(null);
  const containerRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    setMouseX(e.clientX);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouseX(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      mouseX,
      magnification,
      distance,
      baseSize,
    }),
    [mouseX, magnification, distance, baseSize]
  );

  return (
    <DockContext.Provider value={contextValue}>
      <nav
        ref={containerRef}
        className={`magic-dock magic-dock--${direction} ${className}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="toolbar"
        aria-label="Thanh công cụ Dock"
      >
        <div className="magic-dock-inner">{children}</div>
      </nav>
    </DockContext.Provider>
  );
}

/**
 * Individual Dock Icon with proximity-based magnification & floating tooltip.
 */
export function DockIcon({
  children,
  className = '',
  label = '',
  badge = null,
  isActive = false,
  onClick,
  ariaLabel,
}) {
  const { mouseX, magnification, distance, baseSize } = useContext(DockContext);
  const iconRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Compute magnified width and height based on distance to cursor
  const size = useMemo(() => {
    if (mouseX === null || !iconRef.current) {
      return baseSize;
    }
    const rect = iconRef.current.getBoundingClientRect();
    const iconCenterX = rect.left + rect.width / 2;
    const dist = Math.abs(mouseX - iconCenterX);

    if (dist > distance) {
      return baseSize;
    }

    // Cosine ease curve for natural, organic magnification
    const ratio = Math.cos((dist / distance) * (Math.PI / 2));
    const targetSize = baseSize + (magnification - baseSize) * ratio;
    return Math.round(targetSize * 10) / 10;
  }, [mouseX, distance, baseSize, magnification]);

  const iconScaleRatio = size / baseSize;

  return (
    <div
      ref={iconRef}
      className={`magic-dock-item-wrapper ${isHovered ? 'is-hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip */}
      {label && (
        <div className="magic-dock-tooltip" role="tooltip" aria-hidden={!isHovered}>
          <span>{label}</span>
          <div className="magic-dock-tooltip-arrow" />
        </div>
      )}

      {/* Interactive Button */}
      <button
        type="button"
        className={`magic-dock-icon-btn ${isActive ? 'is-active' : ''} ${className}`}
        onClick={onClick}
        aria-label={ariaLabel || label}
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
      >
        <div
          className="magic-dock-icon-content"
          style={{
            transform: `scale(${Math.min(1.4, Math.max(1, iconScaleRatio * 0.95))})`,
          }}
        >
          {children}
        </div>

        {/* Counter Badge (e.g. due words for SRS) */}
        {badge !== null && badge !== undefined && badge > 0 && (
          <span className="magic-dock-badge">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>

      {/* Active Dot Indicator */}
      {isActive && <span className="magic-dock-active-dot" aria-hidden="true" />}
    </div>
  );
}

/**
 * Vertical Separator inside Dock.
 */
export function DockSeparator({ className = '' }) {
  return <div className={`magic-dock-separator ${className}`} role="separator" aria-orientation="vertical" />;
}
