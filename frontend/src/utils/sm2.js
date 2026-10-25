/**
 * Pure SM-2 Spaced Repetition Utility for frontend display & preview calculations.
 */

export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;

/**
 * Calculates SM-2 progression for a review attempt.
 *
 * @param {Object} params
 * @param {number} params.intervalDays Current interval in days (0 if new)
 * @param {number} params.easeFactor Current ease factor (default 2.5)
 * @param {number} params.repetitions Consecutive correct count
 * @param {boolean} params.isCorrect Whether response was correct
 * @returns {{ intervalDays: number, easeFactor: number, repetitions: number, nextReviewDate: Date }}
 */
export function calculateNextReview({
  intervalDays = 0,
  easeFactor = DEFAULT_EASE_FACTOR,
  repetitions = 0,
  isCorrect = true,
  fromDate = new Date(),
} = {}) {
  let nextInterval;
  let nextRepetitions;
  let nextEf = easeFactor;

  if (isCorrect) {
    if (repetitions === 0) {
      nextInterval = 1;
    } else if (repetitions === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(intervalDays * easeFactor);
      if (nextInterval <= intervalDays) {
        nextInterval = intervalDays + 1;
      }
    }
    nextRepetitions = repetitions + 1;
    nextEf = Math.min(3.0, Math.round((easeFactor + 0.1) * 100) / 100);
  } else {
    nextInterval = 1;
    nextRepetitions = 0;
    nextEf = Math.max(MIN_EASE_FACTOR, Math.round((easeFactor - 0.2) * 100) / 100);
  }

  const nextReviewDate = new Date(fromDate.getTime() + nextInterval * 24 * 60 * 60 * 1000);

  return {
    intervalDays: nextInterval,
    easeFactor: nextEf,
    repetitions: nextRepetitions,
    nextReviewDate,
  };
}

/**
 * Checks if a vocabulary item is due based on cutoff.
 * Cutoff is usually 4:00 AM in the local browser timezone.
 */
export function isCardDue(nextReviewAt, cutoffHour = 4) {
  if (!nextReviewAt) return false;
  const reviewTime = new Date(nextReviewAt).getTime();
  const now = new Date();
  // Cutoff timestamp for today: today at 04:00 AM
  const cutoffToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), cutoffHour, 0, 0, 0);
  if (now.getHours() >= cutoffHour) {
    // Current study day includes anything up to tomorrow 4:00 AM
    cutoffToday.setDate(cutoffToday.getDate() + 1);
  }
  return reviewTime <= cutoffToday.getTime();
}
