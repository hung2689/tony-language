/**
 * Centralized Lexicon Rank and Badge System
 * Standard Level Progression & Badge Assets
 *
 * | Cấp bậc     | Level   | Asset               |
 * |-------------|---------|---------------------|
 * | Tập sự      | 1–4     | rank-trainee.png    |
 * | Đồng        | 5–9     | rank-bronze.png     |
 * | Bạc         | 10–19   | rank-silver.png     |
 * | Vàng        | 20–29   | rank-gold.png       |
 * | Bạch kim    | 30–44   | rank-platinum.png   |
 * | Kim cương   | 45–59   | rank-diamond.png    |
 * | Huyền thoại | 60–79   | rank-legendary.png  |
 * | Tối thượng  | 80–100  | rank-supreme.png    |
 */

export const LEXICON_RANKS = [
  {
    tierNumber: 1,
    tierId: 'TIER_1_NOVICE',
    rankKey: 'trainee',
    name: 'Tập sự',
    minLevel: 1,
    maxLevel: 4,
    badgeSrc: '/assets/badges/rank-trainee.png',
    color: '#94a3b8',
    description: 'Khởi đầu hành trình tích lũy từ vựng',
  },
  {
    tierNumber: 2,
    tierId: 'TIER_2_BRONZE',
    rankKey: 'bronze',
    name: 'Đồng',
    minLevel: 5,
    maxLevel: 9,
    badgeSrc: '/assets/badges/rank-bronze.png',
    color: '#cd7f32',
    description: 'Đang hình thành thói quen học tập vững chắc',
  },
  {
    tierNumber: 3,
    tierId: 'TIER_3_SILVER',
    rankKey: 'silver',
    name: 'Bạc',
    minLevel: 10,
    maxLevel: 19,
    badgeSrc: '/assets/badges/rank-silver.png',
    color: '#cbd5e1',
    description: 'Vốn từ mở rộng, phản xạ học tập ổn định',
  },
  {
    tierNumber: 4,
    tierId: 'TIER_4_GOLD',
    rankKey: 'gold',
    name: 'Vàng',
    minLevel: 20,
    maxLevel: 29,
    badgeSrc: '/assets/badges/rank-gold.png',
    color: '#eab308',
    description: 'Khả năng ghi nhớ từ vựng nhanh và chính xác',
  },
  {
    tierNumber: 5,
    tierId: 'TIER_5_PLATINUM',
    rankKey: 'platinum',
    name: 'Bạch kim',
    minLevel: 30,
    maxLevel: 44,
    badgeSrc: '/assets/badges/rank-platinum.png',
    color: '#06b6d4',
    description: 'Làm chủ ngữ cảnh từ vựng chuyên sâu',
  },
  {
    tierNumber: 6,
    tierId: 'TIER_6_DIAMOND',
    rankKey: 'diamond',
    name: 'Kim cương',
    minLevel: 45,
    maxLevel: 59,
    badgeSrc: '/assets/badges/rank-diamond.png',
    color: '#8b5cf6',
    description: 'Độ chuẩn xác và tốc độ phản xạ vượt trội',
  },
  {
    tierNumber: 7,
    tierId: 'TIER_7_LEGEND',
    rankKey: 'legendary',
    name: 'Huyền thoại',
    minLevel: 60,
    maxLevel: 79,
    badgeSrc: '/assets/badges/rank-legendary.png',
    color: '#f43f5e',
    description: 'Kỷ luật bền bỉ, trình độ tiếng Anh điêu luyện',
  },
  {
    tierNumber: 8,
    tierId: 'TIER_8_MYTHIC',
    rankKey: 'supreme',
    name: 'Tối thượng',
    minLevel: 80,
    maxLevel: 100,
    badgeSrc: '/assets/badges/rank-supreme.png',
    color: '#f59e0b',
    description: 'Đỉnh cao học thuật và làm chủ ngôn ngữ toàn diện',
  },
];

const TIER_ID_MAP = Object.fromEntries(
  LEXICON_RANKS.map((r) => [r.tierId, r])
);

const TIER_NUM_MAP = Object.fromEntries(
  LEXICON_RANKS.map((r) => [r.tierNumber, r])
);

/**
 * Determine rank from user level safely.
 *
 * Handles:
 * - null, undefined, NaN -> Level 1 (Tập sự)
 * - Level <= 0 -> Clamped to 1 (Tập sự)
 * - Level >= 100 -> Clamped to 100 (Tối thượng)
 * - String levels like "15" -> parsed to integer 15
 *
 * @param {number|string|null|undefined} level
 * @returns {typeof LEXICON_RANKS[number]}
 */
export function getRankFromLevel(level) {
  if (level === null || level === undefined || level === '') {
    return LEXICON_RANKS[0];
  }

  const parsed = typeof level === 'number' ? Math.floor(level) : parseInt(level, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return LEXICON_RANKS[0];
  }

  const clamped = Math.min(100, Math.max(1, parsed));

  for (let i = 0; i < LEXICON_RANKS.length; i++) {
    const r = LEXICON_RANKS[i];
    if (clamped >= r.minLevel && clamped <= r.maxLevel) {
      return r;
    }
  }

  // Fallback (for 100+)
  return LEXICON_RANKS[LEXICON_RANKS.length - 1];
}

/**
 * Get rank metadata by tierId string (e.g. 'TIER_1_NOVICE') or tierNumber (1..8).
 *
 * @param {string|number} identifier
 * @returns {typeof LEXICON_RANKS[number]}
 */
export function getRankByTier(identifier) {
  if (typeof identifier === 'number') {
    return TIER_NUM_MAP[identifier] || LEXICON_RANKS[0];
  }
  if (typeof identifier === 'string') {
    if (TIER_ID_MAP[identifier]) return TIER_ID_MAP[identifier];
    const parsed = parseInt(identifier, 10);
    if (!Number.isNaN(parsed) && TIER_NUM_MAP[parsed]) {
      return TIER_NUM_MAP[parsed];
    }
  }
  return LEXICON_RANKS[0];
}
