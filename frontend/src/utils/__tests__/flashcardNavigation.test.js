import { describe, it, expect } from 'vitest';
import {
  getNextIndex,
  getPrevIndex,
  shuffleCards,
  restartSession,
  calculateProgressPercent,
} from '../flashcardNavigation';

describe('flashcardNavigation', () => {
  describe('getNextIndex', () => {
    it('advances index within range', () => {
      expect(getNextIndex(0, 5)).toBe(1);
      expect(getNextIndex(3, 5)).toBe(4);
    });

    it('does not advance past the last card', () => {
      expect(getNextIndex(4, 5)).toBe(4);
    });

    it('handles empty cards array gracefully', () => {
      expect(getNextIndex(0, 0)).toBe(0);
    });
  });

  describe('getPrevIndex', () => {
    it('steps back index within range', () => {
      expect(getPrevIndex(4)).toBe(3);
      expect(getPrevIndex(1)).toBe(0);
    });

    it('does not decrement past index 0', () => {
      expect(getPrevIndex(0)).toBe(0);
    });
  });

  describe('shuffleCards', () => {
    const originalCards = [
      { id: 1, word: 'apple' },
      { id: 2, word: 'banana' },
      { id: 3, word: 'cherry' },
      { id: 4, word: 'date' },
      { id: 5, word: 'elderberry' },
    ];

    it('preserves array length', () => {
      const shuffled = shuffleCards(originalCards);
      expect(shuffled).toHaveLength(originalCards.length);
    });

    it('returns a new array without mutating the original', () => {
      const copyOriginal = [...originalCards];
      const shuffled = shuffleCards(originalCards);
      expect(shuffled).not.toBe(originalCards);
      expect(originalCards).toEqual(copyOriginal);
    });

    it('contains no duplicate items and no lost items', () => {
      const shuffled = shuffleCards(originalCards);
      const originalIds = originalCards.map((c) => c.id).sort();
      const shuffledIds = shuffled.map((c) => c.id).sort();
      expect(shuffledIds).toEqual(originalIds);
    });

    it('handles empty or non-array input', () => {
      expect(shuffleCards([])).toEqual([]);
      expect(shuffleCards(null)).toEqual([]);
      expect(shuffleCards(undefined)).toEqual([]);
    });
  });

  describe('restartSession', () => {
    it('resets index to 0 and isFlipped to false', () => {
      expect(restartSession()).toEqual({
        currentIndex: 0,
        isFlipped: false,
      });
    });
  });

  describe('calculateProgressPercent', () => {
    it('computes accurate percentages', () => {
      expect(calculateProgressPercent(0, 10)).toBe(10);
      expect(calculateProgressPercent(4, 10)).toBe(50);
      expect(calculateProgressPercent(9, 10)).toBe(100);
      expect(calculateProgressPercent(0, 0)).toBe(0);
    });
  });
});
