import { request } from './api';

export const analyticsService = {
  /**
   * Retrieves overall stats: streaks, accuracy, active days, total questions.
   */
  getOverview(timezone) {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';
    return request(`/analytics/overview?timezone=${encodeURIComponent(tz)}`);
  },

  /**
   * Retrieves the daily activity heatmap for a given year.
   */
  getHeatmap({ year, timezone } = {}) {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';
    const params = new URLSearchParams();
    if (year) params.append('year', String(year));
    params.append('timezone', tz);
    return request(`/analytics/heatmap?${params.toString()}`);
  },

  /**
   * Retrieves memory retention breakdown (unseen, learning, reviewing, mastered).
   */
  getRetention() {
    return request('/analytics/retention');
  },

  /**
   * Retrieves list of words most frequently missed.
   */
  getWeakWords(limit = 10) {
    return request(`/analytics/weak-words?limit=${limit}`);
  },
};
