import React from 'react';

const DEFAULT_WANTED_AVATAR = '/assets/profile/default-avatar.png';

export function formatBounty(bountyValue) {
  if (bountyValue === null || bountyValue === undefined || bountyValue === '') {
    return '0-';
  }
  const num = Number(bountyValue);
  if (Number.isNaN(num) || num < 0) {
    return '0-';
  }
  return `${new Intl.NumberFormat('en-US').format(Math.round(num))}-`;
}

export default function WantedPoster({
  avatarUrl,
  displayName,
  bounty,
  onTriggerAvatarUpload,
}) {
  const portraitSrc = avatarUrl || DEFAULT_WANTED_AVATAR;
  const posterName = (displayName || 'Học viên').trim();

  return (
    <section
      className="lexicon-wanted-poster-col"
      aria-label="Tờ truy nã nhà thám hiểm"
    >
      <div className="lexicon-wanted-poster-card wanted-poster">
        {/* 1. Dynamic HTML Title: WANTED */}
        <header className="wanted-poster__header">
          <span className="wanted-poster__title">WANTED</span>
        </header>

        {/* 2. Dynamic Rectangular Portrait Frame + User Avatar */}
        <button
          type="button"
          className="lexicon-wanted-portrait-box"
          onClick={onTriggerAvatarUpload}
          title="Nhấn để thay đổi ảnh đại diện"
          aria-label="Thay đổi ảnh đại diện từ tờ truy nã"
        >
          <img
            src={portraitSrc}
            alt={posterName}
            className="lexicon-wanted-portrait-img"
            onError={(e) => {
              if (e.currentTarget.src !== window.location.origin + DEFAULT_WANTED_AVATAR) {
                e.currentTarget.src = DEFAULT_WANTED_AVATAR;
              }
            }}
          />
          <img
            src="/assets/profile/wanted-portrait-overlay.png"
            alt=""
            className="lexicon-wanted-portrait-frame-overlay"
            aria-hidden="true"
            draggable="false"
          />
        </button>

        {/* 3. Dynamic Bounty Block: DEAD OR ALIVE + Display Name + Formatted Bounty + MARINE */}
        <div className="wanted-bounty">
          {/* Left Vertical Scroll Flourish */}
          <svg
            className="wanted-bounty__flourish wanted-bounty__flourish--left"
            viewBox="0 0 36 210"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M22 14 C10 6, 4 18, 12 30 C20 42, 6 62, 14 86 C22 106, 26 112, 16 122 C8 130, 12 148, 20 162 C26 174, 14 196, 22 202 C28 206, 32 198, 26 192"
              stroke="currentColor"
              strokeWidth="4.2"
              strokeLinecap="round"
            />
            <circle cx="23" cy="16" r="3.5" fill="currentColor" />
            <circle cx="24" cy="197" r="3.5" fill="currentColor" />
          </svg>

          <div className="wanted-bounty__content">
            <div className="wanted-bounty__label-row">
              <span className="wanted-bounty__wing wanted-bounty__wing--left" aria-hidden="true" />
              <span className="wanted-bounty__label">DEAD OR ALIVE</span>
              <span className="wanted-bounty__wing wanted-bounty__wing--right" aria-hidden="true" />
            </div>

            <h2 className="wanted-bounty__name">{posterName}</h2>

            <p className="wanted-bounty__amount" aria-label={`Tiền thưởng ${formatBounty(bounty)}`}>
              <span className="wanted-bounty__berry" aria-hidden="true">฿</span>
              <span className="wanted-bounty__number">{formatBounty(bounty)}</span>
            </p>

            <div className="wanted-bounty__footer">
              <span className="wanted-bounty__double-lines" aria-hidden="true" />
              <span className="wanted-bounty__authority">MARINE</span>
            </div>
          </div>

          {/* Right Vertical Scroll Flourish */}
          <svg
            className="wanted-bounty__flourish wanted-bounty__flourish--right"
            viewBox="0 0 36 210"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M14 14 C26 6, 32 18, 24 30 C16 42, 30 62, 22 86 C14 106, 10 112, 20 122 C28 130, 24 148, 16 162 C10 174, 22 196, 14 202 C8 206, 4 198, 10 192"
              stroke="currentColor"
              strokeWidth="4.2"
              strokeLinecap="round"
            />
            <circle cx="13" cy="16" r="3.5" fill="currentColor" />
            <circle cx="12" cy="197" r="3.5" fill="currentColor" />
          </svg>
        </div>
      </div>
    </section>
  );
}
