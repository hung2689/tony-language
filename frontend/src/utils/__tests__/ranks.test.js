import { describe, it, expect } from 'vitest';
import { LEXICON_RANKS, getRankFromLevel, getRankByTier } from '../ranks';

describe('Lexicon Ranks System', () => {
  it('covers all 8 standard ranks in order without gaps or overlaps', () => {
    expect(LEXICON_RANKS).toHaveLength(8);

    let expectedMin = 1;
    for (let i = 0; i < LEXICON_RANKS.length; i++) {
      const rank = LEXICON_RANKS[i];
      expect(rank.minLevel).toBe(expectedMin);
      expect(rank.maxLevel).toBeGreaterThanOrEqual(rank.minLevel);
      expect(rank.tierNumber).toBe(i + 1);
      expect(rank.badgeSrc).toMatch(new RegExp(`^/assets/badges/rank-[a-z]+\\.png$`));
      expectedMin = rank.maxLevel + 1;
    }
    expect(expectedMin - 1).toBe(100);
  });

  it('every single level from 1 to 100 maps to exactly one rank', () => {
    for (let lvl = 1; lvl <= 100; lvl++) {
      const rank = getRankFromLevel(lvl);
      expect(rank).toBeDefined();
      expect(lvl).toBeGreaterThanOrEqual(rank.minLevel);
      expect(lvl).toBeLessThanOrEqual(rank.maxLevel);
    }
  });

  describe('Mandatory boundary test milestones', () => {
    it('Level 1 and 4 -> Tập sự (rank-trainee.png)', () => {
      const r1 = getRankFromLevel(1);
      const r4 = getRankFromLevel(4);
      expect(r1.name).toBe('Tập sự');
      expect(r1.rankKey).toBe('trainee');
      expect(r1.badgeSrc).toBe('/assets/badges/rank-trainee.png');

      expect(r4.name).toBe('Tập sự');
      expect(r4.rankKey).toBe('trainee');
      expect(r4.badgeSrc).toBe('/assets/badges/rank-trainee.png');
    });

    it('Level 5 and 9 -> Đồng (rank-bronze.png)', () => {
      const r5 = getRankFromLevel(5);
      const r9 = getRankFromLevel(9);
      expect(r5.name).toBe('Đồng');
      expect(r5.rankKey).toBe('bronze');
      expect(r5.badgeSrc).toBe('/assets/badges/rank-bronze.png');

      expect(r9.name).toBe('Đồng');
      expect(r9.rankKey).toBe('bronze');
      expect(r9.badgeSrc).toBe('/assets/badges/rank-bronze.png');
    });

    it('Level 10 and 19 -> Bạc (rank-silver.png)', () => {
      const r10 = getRankFromLevel(10);
      const r19 = getRankFromLevel(19);
      expect(r10.name).toBe('Bạc');
      expect(r10.rankKey).toBe('silver');
      expect(r10.badgeSrc).toBe('/assets/badges/rank-silver.png');

      expect(r19.name).toBe('Bạc');
      expect(r19.rankKey).toBe('silver');
      expect(r19.badgeSrc).toBe('/assets/badges/rank-silver.png');
    });

    it('Level 20 and 29 -> Vàng (rank-gold.png)', () => {
      const r20 = getRankFromLevel(20);
      const r29 = getRankFromLevel(29);
      expect(r20.name).toBe('Vàng');
      expect(r20.rankKey).toBe('gold');
      expect(r20.badgeSrc).toBe('/assets/badges/rank-gold.png');

      expect(r29.name).toBe('Vàng');
      expect(r29.rankKey).toBe('gold');
      expect(r29.badgeSrc).toBe('/assets/badges/rank-gold.png');
    });

    it('Level 30 and 44 -> Bạch kim (rank-platinum.png)', () => {
      const r30 = getRankFromLevel(30);
      const r44 = getRankFromLevel(44);
      expect(r30.name).toBe('Bạch kim');
      expect(r30.rankKey).toBe('platinum');
      expect(r30.badgeSrc).toBe('/assets/badges/rank-platinum.png');

      expect(r44.name).toBe('Bạch kim');
      expect(r44.rankKey).toBe('platinum');
      expect(r44.badgeSrc).toBe('/assets/badges/rank-platinum.png');
    });

    it('Level 45 and 59 -> Kim cương (rank-diamond.png)', () => {
      const r45 = getRankFromLevel(45);
      const r59 = getRankFromLevel(59);
      expect(r45.name).toBe('Kim cương');
      expect(r45.rankKey).toBe('diamond');
      expect(r45.badgeSrc).toBe('/assets/badges/rank-diamond.png');

      expect(r59.name).toBe('Kim cương');
      expect(r59.rankKey).toBe('diamond');
      expect(r59.badgeSrc).toBe('/assets/badges/rank-diamond.png');
    });

    it('Level 60 and 79 -> Huyền thoại (rank-legendary.png)', () => {
      const r60 = getRankFromLevel(60);
      const r79 = getRankFromLevel(79);
      expect(r60.name).toBe('Huyền thoại');
      expect(r60.rankKey).toBe('legendary');
      expect(r60.badgeSrc).toBe('/assets/badges/rank-legendary.png');

      expect(r79.name).toBe('Huyền thoại');
      expect(r79.rankKey).toBe('legendary');
      expect(r79.badgeSrc).toBe('/assets/badges/rank-legendary.png');
    });

    it('Level 80 and 100 -> Tối thượng (rank-supreme.png)', () => {
      const r80 = getRankFromLevel(80);
      const r100 = getRankFromLevel(100);
      expect(r80.name).toBe('Tối thượng');
      expect(r80.rankKey).toBe('supreme');
      expect(r80.badgeSrc).toBe('/assets/badges/rank-supreme.png');

      expect(r100.name).toBe('Tối thượng');
      expect(r100.rankKey).toBe('supreme');
      expect(r100.badgeSrc).toBe('/assets/badges/rank-supreme.png');
    });
  });

  describe('Edge cases and safe handling', () => {
    it('handles null, undefined, empty string by returning Level 1 rank (Tập sự)', () => {
      expect(getRankFromLevel(null).name).toBe('Tập sự');
      expect(getRankFromLevel(undefined).name).toBe('Tập sự');
      expect(getRankFromLevel('').name).toBe('Tập sự');
    });

    it('handles negative or 0 levels by clamping to Level 1', () => {
      expect(getRankFromLevel(0).name).toBe('Tập sự');
      expect(getRankFromLevel(-5).name).toBe('Tập sự');
    });

    it('handles levels > 100 by clamping to Level 100 (Tối thượng)', () => {
      expect(getRankFromLevel(101).name).toBe('Tối thượng');
      expect(getRankFromLevel(999).name).toBe('Tối thượng');
    });

    it('handles string numbers correctly', () => {
      expect(getRankFromLevel('12').name).toBe('Bạc');
      expect(getRankFromLevel('35').name).toBe('Bạch kim');
      expect(getRankFromLevel('85').name).toBe('Tối thượng');
    });

    it('getRankByTier correctly looks up by tierId and tierNumber', () => {
      expect(getRankByTier('TIER_1_NOVICE').name).toBe('Tập sự');
      expect(getRankByTier('TIER_4_GOLD').name).toBe('Vàng');
      expect(getRankByTier('TIER_8_MYTHIC').name).toBe('Tối thượng');
      expect(getRankByTier(2).name).toBe('Đồng');
      expect(getRankByTier(6).name).toBe('Kim cương');
    });
  });
});
