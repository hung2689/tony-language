import { describe, it, expect, vi, beforeEach } from 'vitest';
import { studyPlanService } from '../../../services/studyPlanService';
import * as api from '../../../services/api';

describe('Today Summary Consumers & Session Updates', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies getTodaySummary schema returns count fields without cards array', async () => {
    const mockSummary = {
      planId: 101,
      planName: 'Daily TOEIC',
      todayDate: '2026-11-06',
      dueWords: 15,
      weakWords: 5,
      newWords: 10,
      totalWords: 30,
    };
    vi.spyOn(api, 'request').mockResolvedValueOnce({ data: mockSummary });

    const summary = await studyPlanService.getTodaySummary({ skipCache: true });

    expect(summary.data.totalWords).toBe(30);
    expect(summary.data.dueWords).toBe(15);
    expect(summary.data.weakWords).toBe(5);
    expect(summary.data.newWords).toBe(10);
    expect(summary.data.cards).toBeUndefined();
  });

  it('simulates post-session update: summary count drops and consumers receive updated counts', async () => {
    // Initial summary: 20 words remaining
    const beforeSessionSummary = {
      planId: 101,
      planName: 'Daily TOEIC',
      todayDate: '2026-11-06',
      dueWords: 12,
      weakWords: 3,
      newWords: 5,
      totalWords: 20,
    };

    // After completing session: 0 words remaining
    const afterSessionSummary = {
      planId: 101,
      planName: 'Daily TOEIC',
      todayDate: '2026-11-06',
      dueWords: 0,
      weakWords: 0,
      newWords: 0,
      totalWords: 0,
    };

    const requestSpy = vi
      .spyOn(api, 'request')
      .mockResolvedValueOnce({ data: beforeSessionSummary })
      .mockResolvedValueOnce({ data: afterSessionSummary });

    // Step 1: Initial load
    const initialRes = await studyPlanService.getTodaySummary({ skipCache: true });
    // Simulate dock / reminder badge logic:
    const dockBadgeBefore = initialRes.data.totalWords ?? initialRes.data.dueWords ?? 0;
    expect(dockBadgeBefore).toBe(20);

    // Step 2: Post-session silent refresh
    const refreshedRes = await studyPlanService.getTodaySummary({ skipCache: true });
    const dockBadgeAfter = refreshedRes.data.totalWords ?? refreshedRes.data.dueWords ?? 0;
    expect(dockBadgeAfter).toBe(0);

    expect(requestSpy).toHaveBeenCalledTimes(2);
    expect(requestSpy).toHaveBeenLastCalledWith('/study-plans/current/today/summary');
  });
});
