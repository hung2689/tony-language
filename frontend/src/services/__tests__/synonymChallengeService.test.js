import { describe, it, expect, vi, beforeEach } from 'vitest';
import { synonymChallengeService } from '../synonymChallengeService';
import * as api from '../api';

describe('synonymChallengeService Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches prioritized synonym challenges for a deck', async () => {
    const mockData = [
      { id: 1, term: 'enormous', meaning: 'to lớn', knownSynonymsCount: 2 },
      { id: 2, term: 'swift', meaning: 'nhanh nhẹn', knownSynonymsCount: 1 },
    ];
    vi.spyOn(api, 'request').mockResolvedValueOnce(mockData);

    const result = await synonymChallengeService.getChallenges(10, 5);

    expect(api.request).toHaveBeenCalledWith('/decks/10/synonym-challenges?limit=5');
    expect(result).toEqual(mockData);
  });

  it('evaluates submitted synonyms with BYOK header if provided', async () => {
    const mockEvaluation = {
      evaluationMode: 'AI_GEMINI',
      evaluatedWords: [{ word: 'huge', isValid: true }],
      missedSynonyms: [{ word: 'gigantic' }],
      totalSubmitted: 1,
      validCount: 1,
      invalidCount: 0,
    };
    vi.spyOn(api, 'request').mockResolvedValueOnce(mockEvaluation);

    const payload = {
      deckId: 10,
      vocabularyId: 1,
      rootWord: 'enormous',
      userAnswers: ['huge'],
    };

    const res = await synonymChallengeService.evaluateAnswers(10, payload, 'custom-gemini-key');

    expect(api.request).toHaveBeenCalledWith(
      '/decks/10/synonym-challenges/evaluate',
      {
        method: 'POST',
        headers: {
          'X-Gemini-Api-Key': 'custom-gemini-key',
        },
        body: JSON.stringify(payload),
      }
    );
    expect(res).toEqual(mockEvaluation);
  });

  it('quick-adds missed synonym to deck', async () => {
    const mockResp = { status: 'ADDED', message: 'Thành công', term: 'colossal' };
    vi.spyOn(api, 'request').mockResolvedValueOnce(mockResp);

    const res = await synonymChallengeService.quickAddCard(10, {
      term: 'colossal',
      meaning: 'khổng lồ',
      pronunciation: '/kəˈlɒs.əl/',
    });

    expect(api.request).toHaveBeenCalledWith('/decks/10/synonym-challenges/quick-add', {
      method: 'POST',
      body: JSON.stringify({
        deckId: 10,
        term: 'colossal',
        meaning: 'khổng lồ',
        pronunciation: '/kəˈlɒs.əl/',
      }),
    });
    expect(res).toEqual(mockResp);
  });
});
