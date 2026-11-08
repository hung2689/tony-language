import { describe, it, expect, vi, beforeEach } from 'vitest';
import { studyPlanService, clearStudyPlanQueueCache } from '../studyPlanService';
import * as api from '../api';

describe('studyPlanService Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearStudyPlanQueueCache();
  });

  it('getCurrentPlan returns null on failure or error response', async () => {
    vi.spyOn(api, 'request').mockRejectedValueOnce(new Error('Network error'));
    const plan = await studyPlanService.getCurrentPlan();
    expect(plan).toBeNull();
  });

  it('getCurrentPlan unwraps response data on success', async () => {
    const mockPlan = { id: 1, name: 'Lộ trình TOEIC', status: 'ACTIVE' };
    vi.spyOn(api, 'request').mockResolvedValueOnce(mockPlan);

    const plan = await studyPlanService.getCurrentPlan();
    expect(plan).toEqual(mockPlan);
  });

  it('createPlan injects browser timezone and passes payload', async () => {
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValueOnce({ data: { id: 10 } });

    await studyPlanService.createPlan({
      name: 'Lộ trình mới',
      deckIds: [1, 2],
      targetDate: '2026-11-20',
      maxNewWordsPerDay: 40,
    });

    expect(requestSpy).toHaveBeenCalledWith(
      '/study-plans',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"timezone"'),
      })
    );
  });

  it('previewAddDecks calls /study-plans/preview with POST', async () => {
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValueOnce({
      data: { totalWords: 100, daysRemaining: 10, avgWordsPerDay: 10, isOverloaded: false },
    });

    const res = await studyPlanService.previewAddDecks({
      deckIds: [5],
      targetDate: '2026-11-01',
      maxNewWordsPerDay: 50,
    });

    expect(requestSpy).toHaveBeenCalledWith(
      '/study-plans/preview',
      expect.objectContaining({ method: 'POST' })
    );
    expect(res.data.totalWords).toBe(100);
  });

  it('addDecksToActivePlan calls /study-plans/current/decks with POST', async () => {
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValueOnce({ data: { id: 1 } });

    await studyPlanService.addDecksToActivePlan({
      deckIds: [3],
      overloadStrategy: 'KEEP_DEADLINE',
    });

    expect(requestSpy).toHaveBeenCalledWith(
      '/study-plans/current/decks',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ deckIds: [3], overloadStrategy: 'KEEP_DEADLINE' }),
      })
    );
  });

  it('removeDeckFromPlan calls /study-plans/current/decks/{id} with DELETE', async () => {
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValueOnce({ data: { id: 1 } });

    await studyPlanService.removeDeckFromPlan(42);

    expect(requestSpy).toHaveBeenCalledWith(
      '/study-plans/current/decks/42',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('removeDecksFromPlan calls /study-plans/current/decks/remove with POST and deckIds array', async () => {
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValueOnce({ data: { id: 1, revision: 2 } });

    const res = await studyPlanService.removeDecksFromPlan(['10', 20]);

    expect(requestSpy).toHaveBeenCalledWith(
      '/study-plans/current/decks/remove',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ deckIds: [10, 20] }),
      })
    );
    expect(res).toEqual({ id: 1, revision: 2 });
  });

  it('updatePlan calls /study-plans/current with PATCH', async () => {
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValueOnce({ data: { id: 1 } });

    await studyPlanService.updatePlan({ status: 'PAUSED' });

    expect(requestSpy).toHaveBeenCalledWith(
      '/study-plans/current',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'PAUSED' }),
      })
    );
  });

  it('deleteActivePlan calls /study-plans/current with DELETE', async () => {
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValueOnce({});

    await studyPlanService.deleteActivePlan();

    expect(requestSpy).toHaveBeenCalledWith(
      '/study-plans/current',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('getTodayQueue calls /study-plans/current/today with GET', async () => {
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValueOnce({
      data: { cards: [], dueWords: 0, weakWords: 0, newWords: 0, totalWords: 0 },
    });

    const res = await studyPlanService.getTodayQueue();

    expect(requestSpy).toHaveBeenCalledWith('/study-plans/current/today');
    expect(res.data.totalWords).toBe(0);
  });

  it('getTodaySummary calls /study-plans/current/today/summary with GET when 200 and does NOT call /today', async () => {
    const mockSummary = {
      planId: 1,
      planName: 'Plan TOEIC',
      todayDate: '2026-11-08',
      dueWords: 5,
      weakWords: 2,
      newWords: 3,
      totalWords: 10,
    };
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValueOnce(mockSummary);

    const res = await studyPlanService.getTodaySummary({ skipCache: true });

    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy).toHaveBeenCalledWith('/study-plans/current/today/summary');
    expect(requestSpy).not.toHaveBeenCalledWith('/study-plans/current/today');
    expect(res.totalWords).toBe(10);
    expect(res.dueWords).toBe(5);
  });

  it('getTodaySummary falls back to /today when /today/summary returns 404, computes counts, and caches', async () => {
    const err404 = new Error('Lỗi máy chủ (404)');
    err404.status = 404;

    const mockQueue = {
      planId: 12,
      planName: 'Legacy Plan',
      todayDate: '2026-11-08',
      cards: [{ id: 1 }, { id: 2 }, { id: 3 }],
      dueCount: 2,
      weakCount: 1,
      newCount: 0,
      totalCount: 3,
    };

    const requestSpy = vi.spyOn(api, 'request').mockImplementation((endpoint) => {
      if (endpoint === '/study-plans/current/today/summary') {
        return Promise.reject(err404);
      }
      if (endpoint === '/study-plans/current/today') {
        return Promise.resolve(mockQueue);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    // First call: 404 triggers fallback to /today
    const res = await studyPlanService.getTodaySummary({ skipCache: true });

    expect(requestSpy).toHaveBeenCalledWith('/study-plans/current/today/summary');
    expect(requestSpy).toHaveBeenCalledWith('/study-plans/current/today');
    expect(res.totalWords).toBe(3);
    expect(res.dueWords).toBe(2);
    expect(res.weakWords).toBe(1);
    expect(res.newWords).toBe(0);
    expect(res.planId).toBe(12);

    // Second call without skipCache: should hit cache and NOT call request again
    requestSpy.mockClear();
    const cachedRes = await studyPlanService.getTodaySummary();
    expect(requestSpy).not.toHaveBeenCalled();
    expect(cachedRes).toEqual(res);
  });
});
