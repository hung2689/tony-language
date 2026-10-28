import React, { useState, useEffect } from 'react';
import { Award, Lock, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react';
import RankBadge from '../../../components/common/RankBadge';
import { LEXICON_RANKS, getRankFromLevel } from '../../../utils/ranks';
import { profileService } from '../profileService';

export default function TierList({
  currentLevel = 1,
  currentTierId,
  animated = true,
  onToggleAnimated,
}) {
  const [tiers, setTiers] = useState(LEXICON_RANKS);

  useEffect(() => {
    let mounted = true;
    profileService
      .getTiers()
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          // Merge API data with standard LEXICON_RANKS to guarantee badgeSrc & formatting
          const merged = LEXICON_RANKS.map((stdRank) => {
            const apiMatch = data.find(
              (d) =>
                d.tierId === stdRank.tierId ||
                d.id === stdRank.tierNumber ||
                d.tierNumber === stdRank.tierNumber ||
                d.name === stdRank.name
            );
            return {
              ...stdRank,
              ...(apiMatch || {}),
              badgeSrc: stdRank.badgeSrc,
              name: stdRank.name,
              minLevel: stdRank.minLevel,
              maxLevel: stdRank.maxLevel,
            };
          });
          setTiers(merged);
        }
      })
      .catch(() => {
        // Use LEXICON_RANKS if API unreachable
      });
    return () => {
      mounted = false;
    };
  }, []);

  const safeCurrentLevel = Math.max(1, Math.min(100, parseInt(currentLevel, 10) || 1));
  const userCurrentRank = getRankFromLevel(safeCurrentLevel);

  return (
    <div className="tier-list-container">
      {/* Animation Preference Control */}
      <div className="tier-settings-bar">
        <div className="tier-settings-info">
          <Sparkles size={18} className="tier-settings-icon" />
          <div>
            <h4 className="tier-settings-title">Hiệu ứng huy hiệu & khung</h4>
            <p className="tier-settings-desc">
              Bật hoặc tắt hiệu ứng tương tác trên các huy hiệu cấp bậc.
            </p>
          </div>
        </div>
        <label className="toggle-switch-label">
          <input
            type="checkbox"
            checked={animated}
            onChange={(e) => onToggleAnimated && onToggleAnimated(e.target.checked)}
            className="toggle-switch-input"
          />
          <span className="toggle-switch-slider" />
        </label>
      </div>

      {/* XP Rules Explanation Card */}
      <div className="xp-rules-card">
        <div className="xp-rules-header">
          <HelpCircle size={18} />
          <h4>Quy tắc nhận điểm kinh nghiệm (XP)</h4>
        </div>
        <div className="xp-rules-grid">
          <div className="xp-rule-item">
            <span className="xp-rule-badge">+5 XP</span>
            <span className="xp-rule-text">Trả lời đúng lần thử đầu tiên</span>
          </div>
          <div className="xp-rule-item">
            <span className="xp-rule-badge">+2 XP</span>
            <span className="xp-rule-text">Trả lời đúng khi làm lại câu sai</span>
          </div>
          <div className="xp-rule-item">
            <span className="xp-rule-badge">+10 XP</span>
            <span className="xp-rule-text">Hoàn thành phiên học (từ 5 câu trở lên)</span>
          </div>
          <div className="xp-rule-item">
            <span className="xp-rule-badge">+20 XP</span>
            <span className="xp-rule-text">Duy trì chuỗi học tập hàng ngày (Streak)</span>
          </div>
        </div>
        <p className="xp-rules-cap-note">
          * Giới hạn điểm kinh nghiệm: Tối đa 500 XP mỗi ngày nhằm khuyến khích học tập điều độ.
        </p>
      </div>

      {/* Tiers Grid */}
      <div className="tiers-grid">
        {tiers.map((tier) => {
          const isCurrentTier = userCurrentRank.rankKey === tier.rankKey;
          const isUnlocked = safeCurrentLevel >= tier.minLevel;

          return (
            <div
              key={tier.rankKey || tier.tierId || tier.name}
              className={`tier-card ${isCurrentTier ? 'is-current-tier' : ''} ${
                !isUnlocked ? 'is-locked-tier' : ''
              }`}
            >
              {isCurrentTier && (
                <div className="current-tier-pill">
                  <CheckCircle2 size={12} />
                  <span>Bậc hiện tại</span>
                </div>
              )}

              <div className="tier-card-preview">
                <RankBadge
                  level={tier.minLevel}
                  rank={tier}
                  size="lg"
                  locked={!isUnlocked}
                  animated={animated && isUnlocked}
                />
              </div>

              <div className="tier-card-info">
                <h4 className="tier-card-name">{tier.name}</h4>
                <p className="tier-card-range">
                  Cấp {tier.minLevel} – {tier.maxLevel}
                </p>

                {!isUnlocked ? (
                  <div className="tier-card-locked-badge">
                    <Lock size={12} />
                    <span>Cần đạt cấp {tier.minLevel}</span>
                  </div>
                ) : (
                  <div className="tier-card-unlocked-badge">
                    <Award size={12} />
                    <span>Đã mở khóa</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
