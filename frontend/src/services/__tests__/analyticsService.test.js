import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService } from '../analyticsService';
import * as api from '../api';

describe('analyticsService Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getOverview calls /analytics/overview with encoded timezone', async () => {
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValueOnce({
      currentStreak: 5,
      longestStreak: 12,
      totalQuestions: 150,
      overallAccuracy: 88.5,
    });

    const res = await analyticsService.getOverview('Asia/Ho_Chi_Minh');

    expect(requestSpy).toHaveBeenCalledWith('/analytics/overview?timezone=Asia%2FHo_Chi_Minh');
    expect(res.currentStreak).toBe(5);
  });

  it('getHeatmap appends year and timezone query params', async () => {
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValueOnce({
      year: 2026,
      days: [],
    });

    const res = await analyticsService.getHeatmap({ year: 2026, timezone: 'UTC' });

    expect(requestSpy).toHaveBeenCalledWith('/analytics/heatmap?year=2026&timezone=UTC');
    expect(res.year).toBe(2026);
  });

  it('getRetention calls /analytics/retention', async () => {
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValueOnce({
      unseenCount: 20,
      learningCount: 15,
      reviewingCount: 10,
      masteredCount: 30,
      totalCards: 75,
    });

    const res = await analyticsService.getRetention();

    expect(requestSpy).toHaveBeenCalledWith('/analytics/retention');
    expect(res.masteredCount).toBe(30);
  });

  it('getWeakWords calls /analytics/weak-words with limit', async () => {
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValueOnce([
      { vocabularyId: 1, word: 'ephemeral', wrongCount: 4 },
    ]);

    const res = await analyticsService.getWeakWords(5);

    expect(requestSpy).toHaveBeenCalledWith('/analytics/weak-words?limit=5');
    expect(res[0].word).toBe('ephemeral');
  });
});
