import React from 'react';
import { Flame, Calendar, BookOpen, Target, CheckSquare, Clock, Layers } from 'lucide-react';
import AvatarFrame from '../../../components/common/AvatarFrame';
import RankBadge from '../../../components/common/RankBadge';
import { getRankFromLevel } from '../../../utils/ranks';

function formatXp(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('vi-VN');
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch {
    return '—';
  }
}

function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}p` : `${hours} giờ`;
}

export default function ProfileSummary({
  profile,
  animated = true,
}) {
  const levelInfo = profile?.levelInfo || {
    level: 1,
    currentXp: 0,
    xpForCurrentLevel: 0,
    xpForNextLevel: 80,
    xpIntoLevel: 0,
    xpNeededForNextLevel: 80,
    progressPercent: 0,
    tierId: 'TIER_1_NOVICE',
    tierName: 'Tập sự',
    tierNumber: 1,
  };

  const stats = profile?.stats || {};
  const displayName = profile?.displayName || profile?.username || 'Học viên';
  const username = profile?.username || '';
  const streak = stats.streakDays ?? 0;
  const createdAt = profile?.createdAt;

  const currentLevel = levelInfo.level || 1;
  const tierName = levelInfo.tierName || 'Tập sự';
  const tierNumber = levelInfo.tierNumber || 1;
  const isMaxLevel = currentLevel >= 100;

  // XP progress values
  const xpIntoLevel = levelInfo.xpIntoLevel || 0;
  const xpNeeded = levelInfo.xpNeededForNextLevel || 80;
  const progressPercent = Math.min(100, Math.max(0, levelInfo.progressPercent || 0));

  return (
    <div className="profile-summary-card">
      <div className="profile-header-main">
        {/* Large Framed Avatar */}
        <div className="profile-avatar-wrapper">
          <AvatarFrame
            size="xl"
            tierId={tierNumber}
            src={profile?.avatarUrl}
            name={displayName}
            animated={animated}
          />
        </div>

        {/* User Identity & XP details */}
        <div className="profile-identity-col">
          <div className="profile-name-row">
            <h1 className="profile-display-name">{displayName}</h1>
            <div className="profile-tier-badge">
              <RankBadge level={currentLevel} size="xs" />
              <span className="tier-name-text">{tierName}</span>
              <span className="tier-level-chip">Cấp {currentLevel}</span>
            </div>
          </div>

          {username && (
            <p className="profile-handle">@{username}</p>
          )}

          {/* XP Progress to Next Level */}
          <div className="profile-xp-progress-block">
            <div className="profile-xp-progress-meta">
              <span className="xp-label">Kinh nghiệm cấp độ</span>
              <span className="xp-numbers">
                {isMaxLevel ? (
                  `${formatXp(levelInfo.currentXp)} XP (Tối đa)`
                ) : (
                  `${formatXp(xpIntoLevel)} / ${formatXp(xpNeeded)} XP`
                )}
              </span>
            </div>

            <div
              className="profile-xp-progress-track"
              role="progressbar"
              aria-valuenow={isMaxLevel ? 100 : progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Tiến độ lên cấp ${currentLevel + 1}`}
            >
              <div
                className="profile-xp-progress-fill"
                style={{ width: `${isMaxLevel ? 100 : progressPercent}%` }}
              />
            </div>
          </div>

          {/* Meta row: Streak & Join Date */}
          <div className="profile-meta-row">
            <div className="profile-meta-item streak-meta" title="Chuỗi ngày học liên tiếp">
              <Flame size={16} className="streak-flame-icon" />
              <span>{streak} ngày liên tiếp</span>
            </div>
            <div className="profile-meta-item" title="Thời gian tham gia LEXICON">
              <Calendar size={16} className="text-muted" />
              <span>Tham gia từ {formatDate(createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real Stats Row (No fake numbers) */}
      <div className="profile-stats-row">
        <div className="profile-stat-box">
          <div className="stat-icon-wrapper">
            <BookOpen size={18} />
          </div>
          <div className="stat-text-col">
            <span className="stat-value">
              {stats.wordsStudied !== undefined && stats.wordsStudied !== null
                ? stats.wordsStudied
                : '—'}
            </span>
            <span className="stat-label">Từ đã học</span>
          </div>
        </div>

        <div className="profile-stat-box">
          <div className="stat-icon-wrapper">
            <Target size={18} />
          </div>
          <div className="stat-text-col">
            <span className="stat-value">
              {stats.accuracyPercent !== undefined && stats.accuracyPercent !== null
                ? `${stats.accuracyPercent}%`
                : '—'}
            </span>
            <span className="stat-label">Chính xác</span>
          </div>
        </div>

        <div className="profile-stat-box">
          <div className="stat-icon-wrapper">
            <CheckSquare size={18} />
          </div>
          <div className="stat-text-col">
            <span className="stat-value">
              {stats.totalAnswers !== undefined && stats.totalAnswers !== null
                ? stats.totalAnswers
                : '—'}
            </span>
            <span className="stat-label">Câu trả lời</span>
          </div>
        </div>

        <div className="profile-stat-box">
          <div className="stat-icon-wrapper">
            <Clock size={18} />
          </div>
          <div className="stat-text-col">
            <span className="stat-value">
              {stats.studyTimeMinutes !== undefined && stats.studyTimeMinutes !== null
                ? formatMinutes(stats.studyTimeMinutes)
                : '—'}
            </span>
            <span className="stat-label">Thời gian học</span>
          </div>
        </div>

        <div className="profile-stat-box">
          <div className="stat-icon-wrapper">
            <Layers size={18} />
          </div>
          <div className="stat-text-col">
            <span className="stat-value">
              {stats.deckCount !== undefined && stats.deckCount !== null
                ? stats.deckCount
                : '—'}
            </span>
            <span className="stat-label">Bộ từ vựng</span>
          </div>
        </div>
      </div>
    </div>
  );
}
