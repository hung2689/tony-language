import { request } from './api';

// In-memory cache stores with TTL
const DEFAULT_TTL = 3 * 60 * 1000; // 3 minutes
const HEATMAP_TTL = 5 * 60 * 1000; // 5 minutes

let overviewCache = null;
let overviewCacheTime = 0;
let overviewInFlight = null;

const heatmapCache = new Map();
const heatmapInFlight = new Map();

let retentionCache = null;
let retentionCacheTime = 0;
let retentionInFlight = null;

const weakWordsCache = new Map();
const weakWordsInFlight = new Map();

export function clearAnalyticsCache() {
  overviewCache = null;
  overviewCacheTime = 0;
  overviewInFlight = null;

  heatmapCache.clear();
  heatmapInFlight.clear();

  retentionCache = null;
  retentionCacheTime = 0;
  retentionInFlight = null;

  weakWordsCache.clear();
  weakWordsInFlight.clear();
}

export const analyticsService = {
  /**
   * Fast synchronous getter for cached overview data (if valid).
   */
  getCachedOverview() {
    if (overviewCache && Date.now() - overviewCacheTime < DEFAULT_TTL) {
      return overviewCache;
    }
    return null;
  },

  /**
   * Fast synchronous getter for cached heatmap data.
   */
  getCachedHeatmap(year) {
    const key = String(year || new Date().getFullYear());
    const cached = heatmapCache.get(key);
    if (cached && Date.now() - cached.time < HEATMAP_TTL) {
      return cached.data;
    }
    return null;
  },

  /**
   * Fast synchronous getter for cached retention data.
   */
  getCachedRetention() {
    if (retentionCache && Date.now() - retentionCacheTime < DEFAULT_TTL) {
      return retentionCache;
    }
    return null;
  },

  /**
   * Fast synchronous getter for cached weak words.
   */
  getCachedWeakWords(limit = 10) {
    const key = Number(limit);
    const cached = weakWordsCache.get(key);
    if (cached && Date.now() - cached.time < DEFAULT_TTL) {
      return cached.data;
    }
    return null;
  },

  /**
   * Retrieves overall stats: streaks, accuracy, active days, total questions.
   * Uses in-memory cache and single-flight request deduplication.
   */
  getOverview(timezone, { skipCache = false } = {}) {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';
    if (!skipCache && overviewCache && Date.now() - overviewCacheTime < DEFAULT_TTL) {
      return Promise.resolve(overviewCache);
    }
    if (overviewInFlight) {
      return overviewInFlight;
    }

    overviewInFlight = request(`/analytics/overview?timezone=${encodeURIComponent(tz)}`)
      .then((data) => {
        overviewCache = data;
        overviewCacheTime = Date.now();
        return data;
      })
      .finally(() => {
        overviewInFlight = null;
      });

    return overviewInFlight;
  },

  /**
   * Retrieves the daily activity heatmap for a given year.
   */
  getHeatmap({ year, timezone } = {}, { skipCache = false } = {}) {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';
    const targetYear = year || new Date().getFullYear();
    const cacheKey = `${targetYear}_${tz}`;

    if (!skipCache) {
      const cached = heatmapCache.get(cacheKey);
      if (cached && Date.now() - cached.time < HEATMAP_TTL) {
        return Promise.resolve(cached.data);
      }
    }

    if (heatmapInFlight.has(cacheKey)) {
      return heatmapInFlight.get(cacheKey);
    }

    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    params.append('timezone', tz);

    const promise = request(`/analytics/heatmap?${params.toString()}`)
      .then((data) => {
        heatmapCache.set(cacheKey, { data, time: Date.now() });
        return data;
      })
      .finally(() => {
        heatmapInFlight.delete(cacheKey);
      });

    heatmapInFlight.set(cacheKey, promise);
    return promise;
  },

  /**
   * Retrieves memory retention breakdown (unseen, learning, reviewing, mastered).
   */
  getRetention({ skipCache = false } = {}) {
    if (!skipCache && retentionCache && Date.now() - retentionCacheTime < DEFAULT_TTL) {
      return Promise.resolve(retentionCache);
    }
    if (retentionInFlight) {
      return retentionInFlight;
    }

    retentionInFlight = request('/analytics/retention')
      .then((data) => {
        retentionCache = data;
        retentionCacheTime = Date.now();
        return data;
      })
      .finally(() => {
        retentionInFlight = null;
      });

    return retentionInFlight;
  },

  /**
   * Retrieves list of words most frequently missed.
   */
  getWeakWords(limit = 10, { skipCache = false } = {}) {
    const key = Number(limit);
    if (!skipCache) {
      const cached = weakWordsCache.get(key);
      if (cached && Date.now() - cached.time < DEFAULT_TTL) {
        return Promise.resolve(cached.data);
      }
    }

    if (weakWordsInFlight.has(key)) {
      return weakWordsInFlight.get(key);
    }

    const promise = request(`/analytics/weak-words?limit=${limit}`)
      .then((data) => {
        weakWordsCache.set(key, { data, time: Date.now() });
        return data;
      })
      .finally(() => {
        weakWordsInFlight.delete(key);
      });

    weakWordsInFlight.set(key, promise);
    return promise;
  },
};
