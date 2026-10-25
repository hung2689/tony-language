import { request } from './api';

export const deckService = {
  getDecks({ folderId, uncategorized, search } = {}) {
    const params = new URLSearchParams();
    if (folderId !== undefined && folderId !== null) params.append('folderId', folderId);
    if (uncategorized) params.append('uncategorized', 'true');
    if (search) params.append('search', search);

    const queryString = params.toString();
    return request(`/decks${queryString ? `?${queryString}` : ''}`);
  },

  getDeck(id) {
    return request(`/decks/${id}`);
  },

  createDeck(data) {
    return request('/decks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateDeck(id, data) {
    return request(`/decks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteDeck(id) {
    return request(`/decks/${id}`, {
      method: 'DELETE',
    });
  },

  moveDeck(id, folderId) {
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
