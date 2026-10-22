import { describe, it, expect } from 'vitest';
import { computeLibraryBackUrl } from '../backNavigation';

describe('backNavigation', () => {
  it('returns folderId query param when deck belongs to a folder', () => {
    const deckWithFolder = { id: 10, name: 'Vocab', folderId: 5 };
    expect(computeLibraryBackUrl(deckWithFolder)).toBe('/?folderId=5');
  });

  it('returns uncategorized query param when deck has no folder (folderId is null)', () => {
    const deckWithoutFolder = { id: 11, name: 'Random', folderId: null };
    expect(computeLibraryBackUrl(deckWithoutFolder)).toBe('/?uncategorized=true');
  });

  it('returns uncategorized query param when folderId is undefined', () => {
    const deckUndefinedFolder = { id: 12, name: 'Legacy' };
    expect(computeLibraryBackUrl(deckUndefinedFolder)).toBe('/?uncategorized=true');
  });

  it('falls back to root / when deck is null or undefined', () => {
    expect(computeLibraryBackUrl(null)).toBe('/');
    expect(computeLibraryBackUrl(undefined)).toBe('/');
  });
});
