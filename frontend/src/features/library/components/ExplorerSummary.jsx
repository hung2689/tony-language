import React from 'react';
import { LEXICON_ASSETS } from '../lexiconMapData';
import RankBadge from '../../../components/common/RankBadge';
import { getRankFromLevel } from '../../../utils/ranks';

export default function ExplorerSummary({
  level = 3,
  rankTitle = 'Thám hiểm',
  expPercent = 64,
  wordsLearned = 248,
  wordsGoal = 1000,
  streakDays = 7,
  currentDestination = {
    title: 'Mountains of Discovery',
    subtitle: 'Trung cấp • Học thuật & Đọc hiểu',
  },
  onClickLevel,
  onClickWords,
  onClickStreak,
  onClickDestination,
}) {
  const currentRank = getRankFromLevel(level);
  const displayRankTitle =
    rankTitle && rankTitle !== 'Explorer' ? rankTitle : currentRank.name;

  return (
    <section
      className="lexicon-summary-banner"
      aria-label="Thế giới từ vựng và tóm tắt tiến trình thám hiểm"
    >
      {/* Left: Botanical Branch + Main Serif Heading & Subtitle */}
      <div className="lexicon-summary-intro">
        <img
          src={LEXICON_ASSETS.textures.leafBranch}
          alt=""
          className="lexicon-intro-leaf-art"
          aria-hidden="true"
        />
        <div className="lexicon-intro-text">
          <h1 className="lexicon-intro-heading">Thế giới từ vựng của bạn</h1>
          <p className="lexicon-intro-subtitle">
            Học từ vựng mới &bull; Khám phá những chân trời mới
          </p>
          <div className="lexicon-intro-divider" aria-hidden="true">
            <span className="lexicon-divider-line" />
            <img
              src={LEXICON_ASSETS.textures.compassRose}
              alt=""
              className="lexicon-divider-compass"
            />
            <span className="lexicon-divider-line" />
          </div>
        </div>
      </div>

      {/* Right: 4 Compact Hand-Drawn Parchment Summary Cards */}
      <div className="lexicon-summary-cards-row">
        {/* 1. Explorer Level */}
        <button
          type="button"
          className="lexicon-stat-card is-level-card"
          onClick={onClickLevel}
          title={`Xem cấp bậc thám hiểm & tiến trình (${displayRankTitle})`}
        >
          <div className="lexicon-stat-card-top">
            <RankBadge
              level={level}
              size="sm"
              className="lexicon-stat-illust"
            />
            <div className="lexicon-stat-content">
              <span className="lexicon-stat-label">Cấp độ thám hiểm</span>
              <div className="lexicon-stat-main-line">
                <strong className="lexicon-stat-big">Lv. {level}</strong>
                <span className="lexicon-stat-rank">{displayRankTitle}</span>
              </div>
              <div
                className="lexicon-mini-xp-track"
                role="progressbar"
                aria-valuenow={expPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="lexicon-mini-xp-fill"
                  style={{ width: `${expPercent}%` }}
                />
              </div>
            </div>
          </div>
        </button>

        {/* 2. Words Learned */}
        <button
          type="button"
          className="lexicon-stat-card is-words-card"
          onClick={onClickWords}
          title="Xem danh sách bộ từ vựng"
        >
          <div className="lexicon-stat-card-top">
            <img
              src={LEXICON_ASSETS.decor.vocabularyBook}
              alt=""
              className="lexicon-stat-illust"
            />
            <div className="lexicon-stat-content">
              <span className="lexicon-stat-label">Từ đã học</span>
              <div className="lexicon-stat-main-line">
                <strong className="lexicon-stat-big">
                  {Number(wordsLearned).toLocaleString()}
                </strong>
                <span className="lexicon-stat-muted">
                  / {Number(wordsGoal).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* 3. Daily Streak */}
        <button
          type="button"
          className="lexicon-stat-card is-streak-card"
          onClick={onClickStreak}
          title="Xem chuỗi ngày học & thống kê"
        >
          <div className="lexicon-stat-card-top">
            <img
              src={LEXICON_ASSETS.header.streakFlame}
              alt=""
              className="lexicon-stat-illust"
            />
            <div className="lexicon-stat-content">
              <span className="lexicon-stat-label">Chuỗi ngày học</span>
              <div className="lexicon-stat-main-line">
                <strong className="lexicon-stat-big">{streakDays} ngày</strong>
              </div>
            </div>
          </div>
        </button>

        {/* 4. Current Destination */}
        <button
          type="button"
          className="lexicon-stat-card is-destination-card"
          onClick={onClickDestination}
          title={`Điểm đến hiện tại: ${currentDestination.title}`}
        >
          <div className="lexicon-stat-card-top">
            <img
              src={LEXICON_ASSETS.decor.mountainRange}
              alt=""
              className="lexicon-stat-illust is-wide"
            />
            <div className="lexicon-stat-content">
              <span className="lexicon-stat-label">Điểm đến hiện tại</span>
              <strong className="lexicon-destination-title">
                {currentDestination.title}
              </strong>
              <span className="lexicon-destination-sub">
                {currentDestination.subtitle}
              </span>
            </div>
          </div>
        </button>
      </div>
    </section>
  );
}
