/**
 * Pure helper to compute the return URL to the library
 * preserving the exact folder context the deck belongs to.
 */

export function computeLibraryBackUrl(deck) {
  if (!deck) return '/';

  if (deck.folderId !== null && deck.folderId !== undefined) {
    return `/?folderId=${encodeURIComponent(deck.folderId)}`;
  }

  return '/?uncategorized=true';
}
