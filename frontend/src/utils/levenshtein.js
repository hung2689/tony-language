/**
 * Pure Levenshtein Distance calculation.
 * Measures the minimum number of single-character edits (insertions, deletions, or substitutions)
 * required to change one string into the other.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a || a.length === 0) return b ? b.length : 0;
  if (!b || b.length === 0) return a.length;

  const aLen = a.length;
  const bLen = b.length;

  // Use two rows for O(min(M, N)) space optimization
  let prevRow = new Array(bLen + 1);
  let currRow = new Array(bLen + 1);

  for (let j = 0; j <= bLen; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= aLen; i++) {
    currRow[0] = i;
    const aChar = a.charAt(i - 1);

    for (let j = 1; j <= bLen; j++) {
      const bChar = b.charAt(j - 1);
      const cost = aChar === bChar ? 0 : 1;

      currRow[j] = Math.min(
        currRow[j - 1] + 1,      // insertion
        prevRow[j] + 1,          // deletion
        prevRow[j - 1] + cost    // substitution
      );
    }

    // Swap rows
    for (let j = 0; j <= bLen; j++) {
      prevRow[j] = currRow[j];
    }
  }

  return prevRow[bLen];
}
