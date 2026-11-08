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

/**
 * Checks whether an HTTP 404 error represents a missing endpoint (legacy backend)
 * rather than a domain business error (e.g., PLAN_NOT_FOUND).
 */
export function isRouteNotFoundError(err) {
  const status = err?.status ?? err?.statusCode ?? err?.response?.status;
  if (status !== 404) return false;

  const errorCode = err?.errorCode || err?.data?.errorCode;
  const message = (err?.message || err?.data?.message || '').toLowerCase();

  // If backend returned an explicit business error code (e.g., PLAN_NOT_FOUND, RESOURCE_NOT_FOUND),
  // it is a domain business exception, NOT a missing endpoint route.
  if (errorCode && errorCode !== 'NOT_FOUND') {
    return false;
  }

  // If error message indicates a business domain entity not found (e.g. active study plan missing)
  // Note: do not use bare 'plan' as it matches '/study-plans/' in Spring NoResourceFoundException paths
  if (
    message.includes('lộ trình') ||
    message.includes('kế hoạch') ||
    message.includes('plan not found') ||
    message.includes('no active plan')
  ) {
    return false;
  }

  // Missing route on legacy backends:
  // 1. Spring NoResourceFoundException (errorCode: "NOT_FOUND", "No static resource ...")
  // 2. Default Spring Boot 404 (status: 404, message: "Not Found", no business errorCode)
  return true;
}

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
   * If the backend does not have /today/summary yet (HTTP 404 on legacy backends),
   * transparently falls back to /today once, computes summary counts, and caches the result.
   */
  async getTodaySummary({ skipCache = false } = {}) {
    if (!skipCache && todaySummaryCache && Date.now() - todaySummaryCacheTime < QUEUE_CACHE_TTL) {
      return todaySummaryCache;
    }
    try {
      const data = await request('/study-plans/current/today/summary');
      todaySummaryCache = data;
      todaySummaryCacheTime = Date.now();
      return data;
    } catch (err) {
      if (isRouteNotFoundError(err)) {
        const queueData = await this.getTodayQueue({ skipCache });
        const totalCount = queueData?.totalCount ?? queueData?.totalWords ?? queueData?.cards?.length ?? 0;
        const dueCount = queueData?.dueCount ?? queueData?.dueWords ?? 0;
        const weakCount = queueData?.weakCount ?? queueData?.weakWords ?? 0;
        const newCount = queueData?.newCount ?? queueData?.newWords ?? 0;
        const summary = {
          planId: queueData?.planId ?? null,
          planName: queueData?.planName ?? '',
          todayDate: queueData?.todayDate ?? new Date().toISOString().split('T')[0],
          totalWords: totalCount,
          dueWords: dueCount,
          weakWords: weakCount,
          newWords: newCount,
          totalCount,
          dueCount,
          weakCount,
          newCount,
        };
        todaySummaryCache = summary;
        todaySummaryCacheTime = Date.now();
        return summary;
      }
      throw err;
    }
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
