import { describe, it, expect, vi, beforeEach } from 'vitest';
import { studyPlanService } from '../studyPlanService';
import * as api from '../api';

describe('studyPlanService Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});
