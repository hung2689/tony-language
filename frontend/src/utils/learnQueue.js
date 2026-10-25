/**
 * Global Weighted Probability Queue Engine for Learn Mode.
 * Pure deterministic functions with injectable RNG.
 */

export const TARGET_MASTERY = 3;

/**
 * Fisher-Yates uniform shuffle with injectable RNG.
 *
 * @template T
 * @param {T[]} array
 * @param {() => number} [rng=Math.random]
 * @returns {T[]}
 */
export function shuffleArray(array, rng = Math.random) {
  if (!Array.isArray(array)) return [];
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Calculates sampling weight for an item using the piecewise formula:
 * - If masteryLevel >= TARGET_MASTERY (3): W = 0
 * - If masteryLevel < TARGET_MASTERY (3): max(1, 10 + (8 * wrongCount) - (3 * masteryLevel))
 *
 * @param {object} item
 * @returns {number}
 */
export function calculateWeight(item) {
  if (!item) return 0;
  if (item.masteryLevel >= TARGET_MASTERY) {
    return 0;
  }
  const base = 10;
  const wrongBonus = 8 * (item.wrongCount || 0);
  const correctPenalty = 3 * (item.masteryLevel || 0);
  return Math.max(1, base + wrongBonus - correctPenalty);
}

/**
 * Picks the next item from the candidate pool using weighted probability
 * with anti-echo cooldown on the immediate predecessor.
 *
 * @param {Array<object>} items
 * @param {string|number|null} [lastCardId=null]
 * @param {() => number} [rng=Math.random]
 * @returns {object|null}
 */
export function pickNextItem(items, lastCardId = null, rng = Math.random) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  // 1. Candidate Pool Extraction: cards with masteryLevel < TARGET_MASTERY
  const candidatePool = items.filter((item) => item.masteryLevel < TARGET_MASTERY);
  if (candidatePool.length === 0) {
    return null;
  }

  // 2. Single Remaining Card Boundary: bypass anti-echo cooldown
  if (candidatePool.length === 1) {
    return candidatePool[0];
  }

  // 3. Cooldown Filter (Anti-Echo): exclude lastCardId if alternatives exist
  const nonImmediatePool = candidatePool.filter((item) => item.cardId !== lastCardId);
  const poolToSample = nonImmediatePool.length > 0 ? nonImmediatePool : candidatePool;

  // 4. Discrete Cumulative Distribution Sampling (Roulette Wheel)
  const weights = poolToSample.map((item) => calculateWeight(item));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight <= 0) {
    return poolToSample[0];
  }

  let R = rng() * totalWeight;

  for (let k = 0; k < poolToSample.length; k++) {
    R = R - weights[k];
    if (R <= 0) {
      return poolToSample[k];
    }
  }

  // Floating-point precision underflow guard
  return poolToSample[poolToSample.length - 1];
}

/**
 * Builds the initial session pool adhering to the Item State Model.
 *
 * @param {Array} cards
 * @param {object} [options={}]
 * @param {() => number} [rng=Math.random]
 * @returns {Array<object>}
 */
export function buildSession(cards, options = {}, rng = Math.random) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return [];
  }

  const {
    countMode = 'all',
    customCount = 10,
    count,
    order = 'random',
    direction = 'VI_TO_EN',
  } = options;

  // 1. Order handling
  const isRandomOrder = order === 'random' || order === 'RANDOM';
  let workingCards = isRandomOrder ? shuffleArray(cards, rng) : [...cards];

  // 2. Count slicing
  const desiredCount =
    typeof count === 'number' && count > 0
      ? count
      : countMode === 'custom' && customCount > 0
      ? customCount
      : null;

  if (desiredCount !== null && desiredCount < workingCards.length) {
    const validCount = Math.max(1, Math.min(desiredCount, workingCards.length));
    workingCards = workingCards.slice(0, validCount);
  }

  // 3. Direction assignment & item model initialization
  const isRandomDirection = direction === 'RANDOM' || direction === 'mixed';

  return workingCards.map((card) => {
    let cardDirection = direction;
    if (isRandomDirection) {
      cardDirection = rng() < 0.5 ? 'VI_TO_EN' : 'EN_TO_VI';
    }
    return {
      cardId: card.id,
      card,
      direction: cardDirection,
      masteryLevel: 0,
      wrongCount: 0,
      attempts: 0,
      attemptNo: 0,
      firstTryCorrect: null,
    };
  });
}
