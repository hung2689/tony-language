import { request } from './api';

// In-memory client cache for decks to support Stale-While-Revalidate and instant tab transitions
const deckCache = new Map();
const deckDetailCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

export const clearDeckCache = (deckId) => {
  if (deckId) {
    deckDetailCache.delete(Number(deckId));
  } else {
    deckCache.clear();
    deckDetailCache.clear();
  }
};

export const deckService = {
  async getDecks({ folderId, uncategorized, search } = {}, { skipCache = false } = {}) {
    const params = new URLSearchParams();
    if (folderId !== undefined && folderId !== null) params.append('folderId', folderId);
    if (uncategorized) params.append('uncategorized', 'true');
    if (search) params.append('search', search);

    const queryString = params.toString();
    const cacheKey = queryString || 'all';

    if (!skipCache && deckCache.has(cacheKey)) {
      return deckCache.get(cacheKey);
    }

    const data = await request(`/decks${queryString ? `?${queryString}` : ''}`);
    deckCache.set(cacheKey, data);
    return data;
  },

  getCachedDecks({ folderId, uncategorized, search } = {}) {
    const params = new URLSearchParams();
    if (folderId !== undefined && folderId !== null) params.append('folderId', folderId);
    if (uncategorized) params.append('uncategorized', 'true');
    if (search) params.append('search', search);

    const queryString = params.toString();
    const cacheKey = queryString || 'all';
    return deckCache.get(cacheKey) || null;
  },

  setCachedDecks({ folderId, uncategorized, search } = {}, data) {
    const params = new URLSearchParams();
    if (folderId !== undefined && folderId !== null) params.append('folderId', folderId);
    if (uncategorized) params.append('uncategorized', 'true');
    if (search) params.append('search', search);

    const queryString = params.toString();
    const cacheKey = queryString || 'all';
    deckCache.set(cacheKey, data);
  },

  clearCache() {
    deckCache.clear();
    deckDetailCache.clear();
  },

  getCachedDeck(id) {
    const key = Number(id);
    const cached = deckDetailCache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      deckDetailCache.delete(key);
      return null;
    }
    return cached.data;
  },

  async getDeck(id, { skipCache = false } = {}) {
    const key = Number(id);
    if (!skipCache) {
      const cached = this.getCachedDeck(key);
      if (cached) return cached;
    }

    const data = await request(`/decks/${key}`);
    deckDetailCache.set(key, { data, timestamp: Date.now() });
    return data;
  },

  // Prefetch deck details (e.g. on hover) so clicking is instantaneous
  prefetchDeck(id) {
    const key = Number(id);
    if (!key || this.getCachedDeck(key)) return;
    request(`/decks/${key}`)
      .then((data) => {
        deckDetailCache.set(key, { data, timestamp: Date.now() });
      })
      .catch(() => {
        // Silent fail for prefetch
      });
  },

  async createDeck(data) {
    this.clearCache();
    return request('/decks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateDeck(id, data) {
    deckDetailCache.delete(Number(id));
    deckCache.clear();
    return request(`/decks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteDeck(id) {
    deckDetailCache.delete(Number(id));
    deckCache.clear();
    return request(`/decks/${id}`, {
      method: 'DELETE',
    });
  },

  async moveDeck(id, folderId) {
    deckDetailCache.delete(Number(id));
    deckCache.clear();
    return request(`/decks/${id}/folder`, {
      method: 'PATCH',
      body: JSON.stringify({ folderId: folderId ?? null }),
    });
  },

  getDeckSrsForecast(id) {
    return request(`/decks/${id}/srs-forecast`);
  },

  getDeckSrsQueue(id) {
    return request(`/decks/${id}/srs-queue`);
  },

  getDeckQueue(id) {
    return request(`/decks/${id}/srs-queue`);
  },
};
