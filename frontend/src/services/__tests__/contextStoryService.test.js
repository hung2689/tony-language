import { describe, it, expect, vi, beforeEach } from 'vitest';
import { contextStoryService } from '../contextStoryService';
import * as api from '../api';

describe('contextStoryService Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws error when deckId is missing', async () => {
    await expect(contextStoryService.getContextStory(null)).rejects.toThrow(
      'Cần có ID bộ từ vựng để tạo đoạn văn bằng AI.'
    );
  });

  it('getContextStory calls backend API and returns AI generated story', async () => {
    const mockResponse = {
      id: 'ai-story-10-12345',
      deckId: 10,
      title: 'A Morning Routine in the Park',
      paragraphs: [
        {
          paragraphIndex: 0,
          title: 'Morning Routine',
          topic: 'Thói quen hàng ngày & Sức khỏe',
          text: 'Every morning, I go for a quick {{0}} in the park to stay healthy.',
          translation: 'Mỗi buổi sáng, tôi đi chạy bộ nhanh trong công viên để giữ gìn sức khỏe.',
          blanks: [
            {
              index: 0,
              cardId: 1,
              term: 'run',
              definition: 'chạy bộ',
              matchedWord: 'run',
              synonyms: ['jog'],
            },
          ],
          usedWords: ['run'],
        },
      ],
      totalBlanks: 1,
      usedWords: ['run'],
      unusedWords: [],
    };

    const requestSpy = vi
      .spyOn(api, 'request')
      .mockResolvedValueOnce(mockResponse);

    const result = await contextStoryService.getContextStory(10);

    expect(requestSpy).toHaveBeenCalledWith('/decks/10/context-story', {
      method: 'POST',
    });
    expect(result).toEqual(mockResponse);
    expect(result.paragraphs[0].title).toBe('Morning Routine');
    expect(result.paragraphs[0].topic).toBe('Thói quen hàng ngày & Sức khỏe');
  });

  it('getContextStory propagates backend error when AI call fails without falling back to heuristic templates', async () => {
    vi.spyOn(api, 'request').mockRejectedValueOnce(
      new Error('AI Gemini request timed out')
    );

    await expect(contextStoryService.getContextStory(10)).rejects.toThrow(
      'AI Gemini request timed out'
    );
  });
});
