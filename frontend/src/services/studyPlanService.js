// Client in-memory cache for today's queue and deck queues to avoid repeated multi-second fetches
let todayQueueCache = null;
let todayQueueCacheTime = 0;
const deckQueueCache = new Map();
const QUEUE_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export const clearStudyPlanQueueCache = () => {
  todayQueueCache = null;
  todayQueueCacheTime = 0;
  deckQueueCache.clear();
};
import { request } from './api';

export const studyPlanService = {
  /**
   * Gets the user's currently active study plan, or null if none.
   */
  async getCurrentPlan() {
    try {
      const response = await request('/study-plans/current');
      return response || null;
    } catch {
      return null;
    }
  },

  /**
   * Creates a new study plan.
   *
   * @param {Object} data
   * @param {string} data.name
   * @param {Array<number>} data.deckIds
   * @param {string} data.targetDate YYYY-MM-DD
   * @param {number} [data.maxNewWordsPerDay=50]
   * @param {number} [data.minWordsPerDay=5]
   * @param {boolean} [data.hardGateEnabled=false]
   */
  createPlan(data) {
    return request('/study-plans', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
      }),
    });
  },

  /**
   * Previews workload calculation for adding decks.
   *
   * @param {Object} data
   * @param {Array<number>} data.deckIds
   * @param {string} data.targetDate YYYY-MM-DD
   * @param {number} [data.maxNewWordsPerDay=50]
   */
  previewAddDecks(data) {
    return request('/study-plans/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Adds decks to the active study plan with optional overload strategy.
   *
   * @param {Object} data
   * @param {Array<number>} data.deckIds
   * @param {'KEEP_DEADLINE'|'EXTEND_DEADLINE'|'INCREASE_CAP'} [data.overloadStrategy]
   * @param {string} [data.newTargetDate]
   * @param {number} [data.newMaxNewWordsPerDay]
   */
  addDecksToActivePlan(data) {
    return request('/study-plans/current/decks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Removes a deck from the active plan.
   */
  removeDeckFromPlan(deckId) {
    return request(`/study-plans/current/decks/${deckId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Updates plan settings (target date, daily cap, hard gate, status).
   */
  updatePlan(data) {
    return request('/study-plans/current', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Deletes the currently active plan.
   */
  deleteActivePlan() {
    return request('/study-plans/current', {
      method: 'DELETE',
    });
  },

  /**
   * Retrieves today's study queue for the active plan.
   */
  getTodayQueue({ skipCache = false } = {}) {
    if (!skipCache && todayQueueCache && (Date.now() - todayQueueCacheTime < QUEUE_CACHE_TTL)) {
      return Promise.resolve(todayQueueCache);
    }
    return request('/study-plans/current/today').then((data) => {
      todayQueueCache = data;
      todayQueueCacheTime = Date.now();
      return data;
    });
  },

  /**
   * Retrieves 7-day Spaced Repetition forecast for active plan.
   */
  getPlanForecast() {
    return request('/study-plans/current/forecast');
  },

  /**
   * Retrieves 7-day Spaced Repetition forecast for a specific deck.
   */
  getDeckForecast(deckId) {
    return request(`/decks/${deckId}/srs-forecast`);
  },

  /**
   * Retrieves SRS queue for a specific deck.
   */
  getDeckQueue(deckId, { skipCache = false } = {}) {
    const key = Number(deckId);
    const cached = deckQueueCache.get(key);
    if (!skipCache && cached && (Date.now() - cached.timestamp < QUEUE_CACHE_TTL)) {
      return Promise.resolve(cached.data);
    }
    return request(`/decks/${key}/srs-queue`).then((data) => {
      deckQueueCache.set(key, { data, timestamp: Date.now() });
      return data;
    });
  },
};
