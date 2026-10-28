import React, { useState, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  LEXICON_ASSETS,
  MAP_DESTINATIONS,
  MAP_TRAVEL_ROUTES,
} from '../lexiconMapData';

export function MapRoute({ routes = MAP_TRAVEL_ROUTES }) {
  return (
    <svg
      className="lexicon-map-routes-svg"
      viewBox="0 0 1000 620"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="routeSoftGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow
            dx="0"
            dy="1"
            stdDeviation="1.5"
            floodColor="#FFF6E5"
            floodOpacity="0.85"
          />
        </filter>
      </defs>

      {/* Dotted Travel Routes Connecting the 5 Destinations */}
      <g filter="url(#routeSoftGlow)">
        {routes.map((route) => (
          <g key={route.id}>
            <path
              d={route.d}
              fill="none"
              stroke="#F7EBD3"
              strokeWidth="5.5"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d={route.d}
              fill="none"
              stroke="#7A4E2D"
              strokeWidth="3.2"
              strokeDasharray="8 8"
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

export function ExplorerLocationLabel({
  title,
  subtitle,
  completedCount,
  totalCount,
}) {
  return (
    <div className="lexicon-location-label-card">
      <div className="lexicon-location-label-main">
        <span className="lexicon-location-title">{title}</span>
        <span className="lexicon-location-subtitle">{subtitle}</span>
      </div>

      <div className="lexicon-location-progress-pill">
        <span className="lexicon-location-count">
          {completedCount}/{totalCount}
        </span>
        <span className="lexicon-location-go-btn" aria-hidden="true">
          <ChevronRight size={13} strokeWidth={2.6} />
        </span>
      </div>
    </div>
  );
}

export function MapLocation({
  destination,
  isSelected,
  completedCount,
  totalCount,
  onSelect,
}) {
  const isForest = destination.id === 'forest-of-beginnings';
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const videoRef = useRef(null);

  const handleClick = () => {
    onSelect?.(destination);

    if (isForest && !hasVideoError && videoRef.current) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

      if (!prefersReducedMotion) {
        if (!isAnimating) {
          setIsAnimating(true);
          videoRef.current.currentTime = 0;
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              console.warn('Island animation playback prevented:', err);
              setIsAnimating(false);
            });
          }
        }
      }
    }
  };

  const handleVideoEnded = () => {
    setIsAnimating(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handleVideoError = () => {
    setHasVideoError(true);
    setIsAnimating(false);
  };

  return (
    <div
      className={`lexicon-map-location is-${destination.key} status-${destination.status} ${
        isSelected ? 'is-selected' : ''
      }`}
      style={{
        left: `${destination.position.left}%`,
        top: `${destination.position.top}%`,
        width: destination.islandWidth,
      }}
    >
      <button
        type="button"
        className="lexicon-location-trigger"
        onClick={handleClick}
        aria-label={`${destination.title} - ${destination.subtitle} (${completedCount}/${totalCount})`}
      >
        {/* Floating Location Pin Marker */}
        <div className="lexicon-location-pin-wrap">
          <img
            src={destination.markerIcon}
            alt=""
            className="lexicon-location-pin-img"
          />
        </div>

        {/* Illustrated Island Artwork */}
        <div className={`lexicon-island-art-wrap ${isForest ? 'is-forest-art' : ''}`}>
          <img
            src={destination.islandImage}
            alt={destination.title}
            className={`lexicon-island-art-img ${isForest && isAnimating ? 'is-animating' : ''}`}
            draggable={false}
          />
          {isForest && !hasVideoError && (
            <video
              ref={videoRef}
              className={`lexicon-island-video-overlay ${isAnimating ? 'is-playing' : ''}`}
              src="/assets/animation/forest-island.mp4"
              playsInline
              muted
              preload="auto"
              onEnded={handleVideoEnded}
              onError={handleVideoError}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Parchment Banner Label with Selectable HTML Text */}
        <ExplorerLocationLabel
          title={destination.title}
          subtitle={destination.subtitle}
          completedCount={completedCount}
          totalCount={totalCount}
        />
      </button>
    </div>
  );
}

export function MapLegend() {
  return (
    <div className="lexicon-map-legend" aria-label="Chú giải bản đồ">
      <div className="lexicon-legend-item">
        <img
          src={LEXICON_ASSETS.markers.completed}
          alt=""
          className="lexicon-legend-pin"
        />
        <span>Đã hoàn thành</span>
      </div>
      <div className="lexicon-legend-divider" />
      <div className="lexicon-legend-item">
        <img
          src={LEXICON_ASSETS.markers.current}
          alt=""
          className="lexicon-legend-pin"
        />
        <span>Đang thực hiện</span>
      </div>
      <div className="lexicon-legend-divider" />
      <div className="lexicon-legend-item">
        <img
          src={LEXICON_ASSETS.markers.locked}
          alt=""
          className="lexicon-legend-pin"
        />
        <span>Chưa mở khóa</span>
      </div>
    </div>
  );
}

export default function WorldMap({
  destinations = MAP_DESTINATIONS,
  selectedDestinationId,
  onSelectDestination,
  destinationProgressMap = {},
}) {
  return (
    <section
      className="lexicon-world-map-region"
      aria-label="Bản đồ thế giới minh họa Lexicon"
    >
      <div className="lexicon-world-map-frame world-map">
        {/* Upper-Left Tilted Instruction Note */}
        <div className="lexicon-map-instruction-note">
          <p>
            Nhấp vào một khu vực để khám phá
            <br />
            các bộ từ vựng thám hiểm!
          </p>
        </div>

        {/* Upper-Right Ornate Compass Rose with Cardinal Directions */}
        <div className="lexicon-map-compass-rose" aria-hidden="true">
          <span className="compass-dir is-n" title="Bắc">B</span>
          <span className="compass-dir is-e" title="Đông">Đ</span>
          <span className="compass-dir is-s" title="Nam">N</span>
          <span className="compass-dir is-w" title="Tây">T</span>
          <img
            src={LEXICON_ASSETS.textures.compassRose}
            alt=""
            className="lexicon-compass-rose-img"
          />
        </div>

        {/* Decorative Clouds, Waves, Whale, Seagulls & Evergreen Trees */}
        <div className="lexicon-map-ambient-layer" aria-hidden="true">
          <img
            src={LEXICON_ASSETS.decor.cloud}
            alt=""
            className="lexicon-ambient-item is-cloud-top-center"
          />
          <img
            src={LEXICON_ASSETS.decor.cloud}
            alt=""
            className="lexicon-ambient-item is-cloud-top-right"
          />
          <img
            src={LEXICON_ASSETS.decor.cloud}
            alt=""
            className="lexicon-ambient-item is-cloud-mid-left"
          />
          <img
            src={LEXICON_ASSETS.decor.evergreenTrees}
            alt=""
            className="lexicon-ambient-item is-trees-upper-left"
          />
          <img
            src={LEXICON_ASSETS.decor.evergreenTrees}
            alt=""
            className="lexicon-ambient-item is-trees-mid-left"
          />
          <img
            src={LEXICON_ASSETS.decor.seagull}
            alt=""
            className="lexicon-ambient-item is-seagull-center"
          />
          <img
            src={LEXICON_ASSETS.decor.oceanWave}
            alt=""
            className="lexicon-ambient-item is-wave-left"
          />
          <img
            src={LEXICON_ASSETS.decor.oceanWave}
            alt=""
            className="lexicon-ambient-item is-wave-center"
          />
          <img
            src={LEXICON_ASSETS.decor.oceanWave}
            alt=""
            className="lexicon-ambient-item is-wave-bottom"
          />
          <img
            src={LEXICON_ASSETS.decor.whale}
            alt=""
            className="lexicon-ambient-item is-whale-south"
          />
          <img
            src={LEXICON_ASSETS.decor.anchor}
            alt=""
            className="lexicon-ambient-item is-anchor-east"
          />
        </div>

        {/* SVG Coastlines & Dotted Explorer Routes */}
        <MapRoute routes={MAP_TRAVEL_ROUTES} />

        {/* 5 Illustrated Island Destinations */}
        <div className="lexicon-map-islands-layer">
          {destinations.map((dest) => {
            const progress = destinationProgressMap[dest.id] || {
              completed: dest.defaultCompleted,
              total: dest.defaultTotal,
            };
            return (
              <MapLocation
                key={dest.id}
                destination={dest}
                isSelected={selectedDestinationId === dest.id}
                completedCount={progress.completed}
                totalCount={progress.total}
                onSelect={onSelectDestination}
              />
            );
          })}
        </div>

        {/* Bottom-Left Quote Banner ("Mỗi từ mới mở ra một thế giới mới.") */}
        <div className="lexicon-map-quote-banner">
          <img
            src={LEXICON_ASSETS.decor.leafSprig}
            alt=""
            className="lexicon-quote-sprig"
            aria-hidden="true"
          />
          <img
            src={LEXICON_ASSETS.textures.quoteEveryWord}
            alt="Mỗi từ mới mở ra một thế giới mới."
            title="Mỗi từ mới mở ra một thế giới mới."
            className="lexicon-quote-scroll-img"
          />
          <span className="sr-only">
            &ldquo;Mỗi từ mới mở ra một thế giới mới.&rdquo;
          </span>
        </div>

        {/* Bottom-Right Map Status Legend (Completed | In Progress | Locked) */}
        <MapLegend />
      </div>
    </section>
  );
}
