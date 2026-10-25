import { describe, it, expect } from 'vitest';
import {
  TARGET_MASTERY,
  calculateWeight,
  pickNextItem,
  buildSession,
  shuffleArray,
} from '../learnQueue';

describe('learnQueue - Global Weighted Probability Engine', () => {
  const sampleCards = [
    { id: 101, term: 'one', definition: 'một' },
    { id: 102, term: 'two', definition: 'hai' },
    { id: 103, term: 'three', definition: 'ba' },
    { id: 104, term: 'four', definition: 'bốn' },
    { id: 105, term: 'five', definition: 'năm' },
  ];

  describe('calculateWeight', () => {
    it('1. Initial state: brand new item has weight 10', () => {
      const item = { masteryLevel: 0, wrongCount: 0 };
      expect(calculateWeight(item)).toBe(10);
    });

    it('2. Weight ordering: missed cards have higher weight than neutral or progressing cards', () => {
      const cardMissed = { masteryLevel: 0, wrongCount: 3 }; // 10 + 24 - 0 = 34
      const cardNeutral = { masteryLevel: 0, wrongCount: 0 }; // 10 + 0 - 0 = 10
      const cardProgressing = { masteryLevel: 2, wrongCount: 0 }; // 10 + 0 - 6 = 4

      const wMissed = calculateWeight(cardMissed);
      const wNeutral = calculateWeight(cardNeutral);
      const wProgressing = calculateWeight(cardProgressing);

      expect(wMissed).toBe(34);
      expect(wNeutral).toBe(10);
      expect(wProgressing).toBe(4);
      expect(wMissed).toBeGreaterThan(wNeutral);
      expect(wNeutral).toBeGreaterThan(wProgressing);
    });

    it('3. Absolute floor: weight is never less than 1 for unmastered items', () => {
      // Hypothetical edge case where penalty exceeds base
      const item = { masteryLevel: 4, wrongCount: 0 };
      // masteryLevel >= 3 returns 0 (graduated)
      expect(calculateWeight(item)).toBe(0);

      // Unmastered item with heavy penalty if masteryLevel < 3
      const itemNearMastery = { masteryLevel: 2, wrongCount: 0 };
      expect(calculateWeight(itemNearMastery)).toBeGreaterThanOrEqual(1);
    });

    it('4. Absolute graduation: weight is 0 when masteryLevel >= TARGET_MASTERY regardless of wrongCount', () => {
      expect(calculateWeight({ masteryLevel: TARGET_MASTERY, wrongCount: 0 })).toBe(0);
      expect(calculateWeight({ masteryLevel: 3, wrongCount: 15 })).toBe(0);
      expect(calculateWeight({ masteryLevel: 4, wrongCount: 5 })).toBe(0);
    });
  });

  describe('pickNextItem', () => {
    it('5. Anti-repeat cooldown: excludes lastCardId when alternative unmastered candidates exist', () => {
      const items = [
        { cardId: 1, masteryLevel: 0, wrongCount: 0 },
        { cardId: 2, masteryLevel: 0, wrongCount: 0 },
      ];

      // Even if rng would select first element, lastCardId=1 must be excluded from pool
      const picked = pickNextItem(items, 1, () => 0.01);
      expect(picked).not.toBeNull();
      expect(picked.cardId).toBe(2);
    });

    it('6. Last-man standing: single remaining unmastered card bypasses cooldown', () => {
      const items = [
        { cardId: 1, masteryLevel: 2, wrongCount: 1 },
        { cardId: 2, masteryLevel: 3, wrongCount: 0 }, // Graduated
      ];

      // lastCardId is 1, but only card 1 remains unmastered
      const picked = pickNextItem(items, 1, () => 0.5);
      expect(picked).not.toBeNull();
      expect(picked.cardId).toBe(1);
    });

    it('7. Full completion: returns null when all items have reached TARGET_MASTERY', () => {
      const items = [
        { cardId: 1, masteryLevel: 3, wrongCount: 2 },
        { cardId: 2, masteryLevel: 3, wrongCount: 0 },
      ];

      expect(pickNextItem(items, 1)).toBeNull();
      expect(pickNextItem([])).toBeNull();
      expect(pickNextItem(null)).toBeNull();
    });

    it('8. Deterministic roulette sampling with injectable RNG', () => {
      const itemA = { cardId: 10, masteryLevel: 0, wrongCount: 0 }; // W = 10
      const itemB = { cardId: 20, masteryLevel: 0, wrongCount: 3 }; // W = 34
      // Total weight = 44. Range for itemA: (0, 10], Range for itemB: (10, 44]
      const items = [itemA, itemB];

      // RNG giving 0.1 -> R = 0.1 * 44 = 4.4 <= 10 -> itemA
      const pickedA = pickNextItem(items, null, () => 0.1);
      expect(pickedA.cardId).toBe(10);

      // RNG giving 0.5 -> R = 0.5 * 44 = 22 > 10 -> itemB
      const pickedB = pickNextItem(items, null, () => 0.5);
      expect(pickedB.cardId).toBe(20);
    });
  });

  describe('buildSession & shuffleArray', () => {
    it('shuffleArray is deterministic with a mock RNG', () => {
      let step = 0;
      const mockRng = () => {
        const values = [0.1, 0.9, 0.5, 0.2];
        return values[(step++) % values.length];
      };

      const shuffled1 = shuffleArray([1, 2, 3, 4], mockRng);
      step = 0;
      const shuffled2 = shuffleArray([1, 2, 3, 4], mockRng);
      expect(shuffled1).toEqual(shuffled2);
    });

    it('buildSession keeps original order when order="order"', () => {
      const session = buildSession(sampleCards, {
        countMode: 'all',
        order: 'order',
        direction: 'VI_TO_EN',
      });

      expect(session.map((q) => q.cardId)).toEqual([101, 102, 103, 104, 105]);
      expect(session.every((q) => q.direction === 'VI_TO_EN')).toBe(true);
      expect(session.every((q) => q.masteryLevel === 0 && q.wrongCount === 0)).toBe(true);
    });

    it('buildSession slices customCount when countMode="custom"', () => {
      const session = buildSession(sampleCards, {
        countMode: 'custom',
        customCount: 3,
        order: 'order',
        direction: 'EN_TO_VI',
      });

      expect(session).toHaveLength(3);
      expect(session.map((q) => q.cardId)).toEqual([101, 102, 103]);
      expect(session.every((q) => q.direction === 'EN_TO_VI')).toBe(true);
    });

    it('buildSession handles customCount greater than cards length gracefully', () => {
      const session = buildSession(sampleCards, {
        countMode: 'custom',
        customCount: 99,
        order: 'order',
      });

      expect(session).toHaveLength(5);
    });

    it('buildSession assigns fixed mixed direction per card when direction="RANDOM"', () => {
      let call = 0;
      const alternatingRng = () => {
        const vals = [0.2, 0.8, 0.1, 0.7, 0.3];
        return vals[(call++) % vals.length];
      };

      const session = buildSession(
        sampleCards,
        { countMode: 'all', order: 'order', direction: 'RANDOM' },
        alternatingRng
      );

      expect(session[0].direction).toBe('VI_TO_EN');
      expect(session[1].direction).toBe('EN_TO_VI');
      expect(session[2].direction).toBe('VI_TO_EN');
      expect(session[3].direction).toBe('EN_TO_VI');
      expect(session[4].direction).toBe('VI_TO_EN');
    });

    it('returns empty array when cards is empty or invalid', () => {
      expect(buildSession([])).toEqual([]);
      expect(buildSession(null)).toEqual([]);
    });
  });
});
