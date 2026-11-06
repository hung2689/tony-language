import React from 'react';

export default function PageSkeleton() {
  return (
    <div
      className="page-skeleton-container"
      role="status"
      aria-label="Đang tải trang..."
      style={{
        width: '100%',
        minHeight: '60vh',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @keyframes pageSkeletonPulse {
          0%, 100% { opacity: 0.65; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.998); }
        }
        .page-skeleton-shimmer {
          background: linear-gradient(90deg, rgba(148, 163, 184, 0.15), rgba(148, 163, 184, 0.28), rgba(148, 163, 184, 0.15));
          border-radius: 8px;
          animation: pageSkeletonPulse 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* Header bar placeholder */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-skeleton-shimmer" style={{ width: '220px', height: '32px', borderRadius: '8px' }} />
        <div className="page-skeleton-shimmer" style={{ width: '120px', height: '36px', borderRadius: '8px' }} />
      </div>

      {/* Subtitle / summary placeholder */}
      <div className="page-skeleton-shimmer" style={{ width: '380px', height: '18px', borderRadius: '6px' }} />

      {/* Content grid cards placeholder */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '18px',
          marginTop: '16px',
        }}
      >
        <div className="page-skeleton-shimmer" style={{ height: '170px', borderRadius: '12px' }} />
        <div className="page-skeleton-shimmer" style={{ height: '170px', borderRadius: '12px' }} />
        <div className="page-skeleton-shimmer" style={{ height: '170px', borderRadius: '12px' }} />
        <div className="page-skeleton-shimmer" style={{ height: '170px', borderRadius: '12px' }} />
      </div>
    </div>
  );
}
