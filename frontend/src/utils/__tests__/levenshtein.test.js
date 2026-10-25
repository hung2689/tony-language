import { describe, it, expect } from 'vitest';
import { levenshtein } from '../levenshtein';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('', '')).toBe(0);
    expect(levenshtein('apple', 'apple')).toBe(0);
  });

  it('handles empty strings correctly', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
    expect(levenshtein(null, 'abc')).toBe(3);
    expect(levenshtein('abc', null)).toBe(3);
  });

  it('calculates single edit distance (insert, delete, replace)', () => {
    expect(levenshtein('cat', 'cats')).toBe(1); // insertion
    expect(levenshtein('cats', 'cat')).toBe(1); // deletion
    expect(levenshtein('cat', 'car')).toBe(1);  // substitution
  });

  it('calculates multiple edits correctly', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('flaw', 'lawn')).toBe(2);
    expect(levenshtein('gumbo', 'gambol')).toBe(2);
  });
});
