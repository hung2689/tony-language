import { describe, it, expect } from 'vitest';
import { calculateNextReview, isCardDue, DEFAULT_EASE_FACTOR, MIN_EASE_FACTOR } from '../sm2';

describe('SM-2 Spaced Repetition Utility', () => {
  const baseDate = new Date('2026-10-23T10:00:00Z');

  it('calculates first correct attempt correctly (interval 1 day, rep 1)', () => {
    const res = calculateNextReview({
      intervalDays: 0,
      easeFactor: DEFAULT_EASE_FACTOR,
      repetitions: 0,
      isCorrect: true,
      fromDate: baseDate,
    });

    expect(res.intervalDays).toBe(1);
    expect(res.repetitions).toBe(1);
    expect(res.easeFactor).toBe(2.6);
    expect(res.nextReviewDate.toISOString()).toBe('2026-10-24T10:00:00.000Z');
  });

  it('calculates second consecutive correct attempt (interval 6 days, rep 2)', () => {
    const res = calculateNextReview({
      intervalDays: 1,
      easeFactor: 2.6,
      repetitions: 1,
      isCorrect: true,
      fromDate: baseDate,
    });

    expect(res.intervalDays).toBe(6);
    expect(res.repetitions).toBe(2);
    expect(res.easeFactor).toBe(2.7);
    expect(res.nextReviewDate.toISOString()).toBe('2026-10-29T10:00:00.000Z');
  });

  it('calculates subsequent correct attempts with interval scaling', () => {
    const res = calculateNextReview({
      intervalDays: 6,
      easeFactor: 2.7,
      repetitions: 2,
      isCorrect: true,
      fromDate: baseDate,
    });

    // 6 * 2.7 = 16.2 -> 16
    expect(res.intervalDays).toBe(16);
    expect(res.repetitions).toBe(3);
    expect(res.easeFactor).toBe(2.8);
  });

  it('handles wrong attempt (resets to interval 1, repetitions 0, decreases EF)', () => {
    const res = calculateNextReview({
      intervalDays: 16,
      easeFactor: 2.5,
      repetitions: 3,
      isCorrect: false,
      fromDate: baseDate,
    });

    expect(res.intervalDays).toBe(1);
    expect(res.repetitions).toBe(0);
    expect(res.easeFactor).toBe(2.3);
  });

  it('never decreases EF below MIN_EASE_FACTOR (1.3)', () => {
    const res = calculateNextReview({
      intervalDays: 1,
      easeFactor: 1.35,
      repetitions: 1,
      isCorrect: false,
      fromDate: baseDate,
    });

    expect(res.intervalDays).toBe(1);
    expect(res.repetitions).toBe(0);
    expect(res.easeFactor).toBe(MIN_EASE_FACTOR);
  });

  it('detects if card is due based on 4 AM cutoff', () => {
    // Card due in the past
    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
    expect(isCardDue(pastDate)).toBe(true);

    // Card due in far future
    const futureDate = new Date(Date.now() + 10 * 86400 * 1000).toISOString();
    expect(isCardDue(futureDate)).toBe(false);

    // Null check
    expect(isCardDue(null)).toBe(false);
  });
});
