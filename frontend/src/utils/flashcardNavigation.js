/**
 * Pure helper functions for flashcard navigation, shuffling, and session reset.
 */

export function getNextIndex(currentIndex, totalCount) {
  if (totalCount <= 0) return 0;
  if (currentIndex >= totalCount - 1) return currentIndex;
  return currentIndex + 1;
}

export function getPrevIndex(currentIndex) {
  if (currentIndex <= 0) return 0;
  return currentIndex - 1;
}

/**
 * Shuffles an array of cards using Fisher-Yates algorithm.
 * Guarantees that:
 * - Returns a new array (no mutation of original)
 * - Contains the exact same number of items
 * - No items are lost or duplicated
 */
export function shuffleCards(cards) {
  if (!Array.isArray(cards)) return [];
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Resets flashcard session state.
 */
export function restartSession() {
  return {
    currentIndex: 0,
    isFlipped: false,
  };
}

/**
 * Calculates current progress percentage.
 */
export function calculateProgressPercent(currentIndex, totalCount) {
  if (totalCount <= 0) return 0;
  return Math.min(100, Math.round(((currentIndex + 1) / totalCount) * 100));
}
