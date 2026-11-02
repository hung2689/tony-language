import { request } from './api';

export const synonymChallengeService = {
  /**
   * Retrieves the queue of cards for Synonym Challenge in a deck.
   * Cards are prioritized by weak/unreviewed status.
   */
  async getChallenges(deckId, limit = 20) {
    try {
      const res = await request(`/decks/${deckId}/synonym-challenges?limit=${limit}`);
      return Array.isArray(res) ? res : (res?.data || []);
    } catch (error) {
      console.error('Failed to fetch synonym challenges:', error);
      throw error;
    }
  },

  /**
   * Evaluates user's submitted synonyms with Dual-Layer (DB + Gemini AI).
   * Supports BYOK via X-Gemini-Api-Key header.
   */
  async evaluateAnswers(deckId, payload, customApiKey = null) {
    const headers = {};
    if (customApiKey && customApiKey.trim()) {
      headers['X-Gemini-Api-Key'] = customApiKey.trim();
    }

    try {
      const res = await request(`/decks/${deckId}/synonym-challenges/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      return res;
    } catch (error) {
      console.error('Failed to evaluate synonym challenge:', error);
      throw error;
    }
  },

  /**
   * Quick-adds a missed synonym as a new card in the deck.
   */
  async quickAddCard(deckId, cardData) {
    try {
      const res = await request(`/decks/${deckId}/synonym-challenges/quick-add`, {
        method: 'POST',
        body: JSON.stringify({
          deckId,
          ...cardData,
        }),
      });
      return res;
    } catch (error) {
      console.error('Failed to quick add card to deck:', error);
      throw error;
    }
  },

  /**
   * Retrieves aggregated stats for the user in this deck.
   */
  async getStats(deckId) {
    try {
      const res = await request(`/decks/${deckId}/synonym-challenges/stats`);
      return res;
    } catch (error) {
      console.error('Failed to fetch synonym stats:', error);
      return null;
    }
  },
};
