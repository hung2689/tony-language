import { request } from './api';

// Client in-memory cache for today's queue, summary, and deck queues to avoid repeated multi-second fetches
let todayQueueCache = null;
let todayQueueCacheTime = 0;
let todaySummaryCache = null;
let todaySummaryCacheTime = 0;
const deckQueueCache = new Map();
const QUEUE_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export const clearStudyPlanQueueCache = () => {
  todayQueueCache = null;
  todayQueueCacheTime = 0;
  todaySummaryCache = null;
  todaySummaryCacheTime = 0;
  deckQueueCache.clear();
};

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
   */
  createPlan(data) {
    clearStudyPlanQueueCache();
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
   */
  previewAddDecks(data) {
    return request('/study-plans/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Adds decks to the active study plan with optional overload strategy and preserved deckPositions.
   */
  addDecksToActivePlan(data) {
    clearStudyPlanQueueCache();
    return request('/study-plans/current/decks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Removes multiple decks (or a single deck) from the active plan in a single batch request.
   *
   * @param {Array<number>} deckIds
   */
  async removeDecksFromPlan(deckIds) {
    clearStudyPlanQueueCache();
    const res = await request('/study-plans/current/decks/remove', {
      method: 'POST',
      body: JSON.stringify({ deckIds: (deckIds || []).map(Number) }),
    });
    return res?.data ?? res;
  },

  /**
   * Legacy single-deck removal (kept for backwards compatibility during transition).
   */
  removeDeckFromPlan(deckId) {
    clearStudyPlanQueueCache();
    return request(`/study-plans/current/decks/${deckId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Updates plan settings (target date, daily cap, hard gate, status).
   */
  updatePlan(data) {
    clearStudyPlanQueueCache();
    return request('/study-plans/current', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Deletes the currently active plan.
   */
  deleteActivePlan() {
    clearStudyPlanQueueCache();
    return request('/study-plans/current', {
      method: 'DELETE',
    });
  },

  /**
   * Retrieves today's study queue for the active plan.
   */
  getTodayQueue({ skipCache = false } = {}) {
    if (!skipCache && todayQueueCache && Date.now() - todayQueueCacheTime < QUEUE_CACHE_TTL) {
      return Promise.resolve(todayQueueCache);
    }
    return request('/study-plans/current/today').then((data) => {
      todayQueueCache = data;
      todayQueueCacheTime = Date.now();
      return data;
    });
  },

  /**
   * Retrieves today's study queue lightweight count summary for the active plan.
   */
  getTodaySummary({ skipCache = false } = {}) {
    if (!skipCache && todaySummaryCache && Date.now() - todaySummaryCacheTime < QUEUE_CACHE_TTL) {
      return Promise.resolve(todaySummaryCache);
    }
    return request('/study-plans/current/today/summary').then((data) => {
      todaySummaryCache = data;
      todaySummaryCacheTime = Date.now();
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
    if (!skipCache && cached && Date.now() - cached.timestamp < QUEUE_CACHE_TTL) {
      return Promise.resolve(cached.data);
    }
    return request(`/decks/${key}/srs-queue`).then((data) => {
      deckQueueCache.set(key, { data, timestamp: Date.now() });
      return data;
    });
  },
};
