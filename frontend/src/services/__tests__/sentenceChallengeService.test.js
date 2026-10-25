import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sentenceChallengeService } from '../sentenceChallengeService';
import * as api from '../api';

describe('sentenceChallengeService Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockCards = [
    {
      id: 1,
      term: 'exhausted',
      definition: 'kiệt sức, vô cùng mệt mỏi',
      partOfSpeech: 'adjective',
      example: 'I was exhausted after running the marathon.',
    },
    {
      id: 2,
      term: 'accomplish',
      definition: 'hoàn thành, đạt được',
      partOfSpeech: 'verb',
      example: 'She accomplished all her goals for the year.',
    },
  ];

  it('fetches challenges from backend when API succeeds', async () => {
    const mockApiResponse = [
      {
        cardId: 1,
        targetWord: 'exhausted',
        meaning: 'kiệt sức',
        promptVi: 'Tôi cảm thấy kiệt sức sau một ngày làm việc dài.',
        referenceEn: 'I feel exhausted after a long day of work.',
      },
    ];

    vi.spyOn(api, 'request').mockResolvedValueOnce(mockApiResponse);

    const result = await sentenceChallengeService.getChallenges(10, mockCards, 'My Deck');

    expect(api.request).toHaveBeenCalledWith('/decks/10/sentence-challenges');
    expect(result).toEqual(mockApiResponse);
  });

  it('falls back to client generation when backend fails', async () => {
    vi.spyOn(api, 'request').mockRejectedValueOnce(new Error('Network error'));

    const result = await sentenceChallengeService.getChallenges(10, mockCards, 'My Deck');

    expect(result).toHaveLength(2);
    expect(result[0].targetWord).toBeDefined();
    expect(result[0].promptVi).toBeDefined();
    expect(result[0].referenceEn).toBeDefined();
  });

  it('evaluates sentence with backend when API succeeds', async () => {
    const mockEvalResponse = {
      score: 95,
      targetWordUsed: true,
      feedback: 'Câu viết rất tốt!',
      nativeAlternative: 'I am exhausted today.',
      grammarNotes: [],
    };

    vi.spyOn(api, 'request').mockResolvedValueOnce(mockEvalResponse);

    const payload = {
      cardId: 1,
      targetWord: 'exhausted',
      promptVi: 'Hôm nay tôi mệt.',
      userSentence: 'I am exhausted today.',
      referenceSentence: 'I feel exhausted today.',
    };

    const res = await sentenceChallengeService.evaluateSentence(10, payload);

    expect(res.score).toBe(95);
    expect(res.targetWordUsed).toBe(true);
  });

  it('performs accurate fallback evaluation when backend is unavailable', async () => {
    vi.spyOn(api, 'request').mockRejectedValueOnce(new Error('Server offline'));

    const payload = {
      cardId: 1,
      targetWord: 'exhausted',
      promptVi: 'Hôm nay tôi mệt.',
      userSentence: 'Today I am exhausted after hard work.',
      referenceSentence: 'Today I am exhausted from working hard.',
    };

    const res = await sentenceChallengeService.evaluateSentence(10, payload);

    expect(res).toBeDefined();
    expect(res.targetWordUsed).toBe(true);
    expect(res.score).toBeGreaterThanOrEqual(70);
    expect(res.feedback).toContain('exhausted');
  });

  it('detects missing target word in local fallback evaluation', async () => {
    vi.spyOn(api, 'request').mockRejectedValueOnce(new Error('Server offline'));

    const payload = {
      cardId: 1,
      targetWord: 'exhausted',
      promptVi: 'Hôm nay tôi mệt.',
      userSentence: 'Today I feel very tired.',
      referenceSentence: 'Today I am exhausted.',
    };

    const res = await sentenceChallengeService.evaluateSentence(10, payload);

    expect(res.targetWordUsed).toBe(false);
    expect(res.feedback).toContain('chưa xuất hiện từ khóa mục tiêu');
  });
});
