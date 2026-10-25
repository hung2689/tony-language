import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  contextStoryService,
  buildFallbackStory,
  findAndReplaceTerm,
} from '../contextStoryService';
import * as api from '../api';

describe('contextStoryService Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockCards = [
    {
      id: 1,
      term: 'meticulous',
      definition: 'tỉ mỉ, cẩn thận',
      partOfSpeech: 'adjective',
      example: 'He is meticulous about keeping his notes clean.',
      synonyms: ['careful', 'precise'],
    },
    {
      id: 2,
      term: 'persevere',
      definition: 'kiên trì, bền chí',
      partOfSpeech: 'verb',
      example: 'We must persevere despite severe hardship.',
      synonyms: ['persist', 'endure'],
    },
    {
      id: 3,
      term: 'catalyst',
      definition: 'chất xúc tác',
      partOfSpeech: 'noun',
      example: 'The new policy was a catalyst for technological growth.',
      synonyms: ['spark', 'stimulus'],
    },
  ];

  it('buildFallbackStory creates valid structured story with blanks', () => {
    const story = buildFallbackStory(10, mockCards, 'Khoa học và đời sống');

    expect(story).toBeDefined();
    expect(story.deckId).toBe(10);
    expect(story.title).toContain('Khoa học và đời sống');
    expect(story.totalBlanks).toBe(3);
    expect(story.paragraphs.length).toBeGreaterThan(0);

    const firstPara = story.paragraphs[0];
    expect(firstPara.blanks.length).toBe(3);
    expect(firstPara.text).toContain('{{0}}');
    expect(firstPara.text).toContain('{{1}}');
    expect(firstPara.text).toContain('{{2}}');
    expect(firstPara.translation).toBeDefined();
  });

  it('buildFallbackStory throws error when cards list is empty', () => {
    expect(() => buildFallbackStory(10, [])).toThrow(
      'Bộ từ vựng cần có ít nhất 1 thẻ'
    );
  });

  it('findAndReplaceTerm replaces full inflected word without dangling suffix', () => {
    const result = findAndReplaceTerm(
      'A sudden flash of light illuminated the dark room.',
      'illuminate',
      '{{0}}'
    );
    expect(result.found).toBe(true);
    expect(result.matchedWord).toBe('illuminated');
    expect(result.replacedText).toBe(
      'A sudden flash of light {{0}} the dark room.'
    );
    expect(result.replacedText).not.toContain('{{0}}d');
  });

  it('findAndReplaceTerm avoids substring collision on word boundaries', () => {
    const result = findAndReplaceTerm(
      'The application crashed suddenly.',
      'cat',
      '{{0}}'
    );
    expect(result.found).toBe(false);
    expect(result.replacedText).toBe('The application crashed suddenly.');
  });

  it('buildFallbackStory automatically includes inflected word in synonyms', () => {
    const inflectedCards = [
      {
        id: 10,
        term: 'illuminate',
        definition: 'chiếu sáng',
        partOfSpeech: 'verb',
        example: 'A sudden flash illuminated the hall.',
        synonyms: ['brighten'],
      },
    ];

    const story = buildFallbackStory(99, inflectedCards, 'Test');
    const blank = story.paragraphs[0].blanks[0];
    expect(blank.synonyms).toContain('illuminated');
    expect(blank.matchedWord).toBe('illuminated');
  });

  it('findAndReplaceTerm supports leading "to " particle and inflections', () => {
    const result = findAndReplaceTerm(
      'They explored the ancient cave thoroughly.',
      'to explore',
      '{{0}}'
    );
    expect(result.found).toBe(true);
    expect(result.matchedWord).toBe('explored');
    expect(result.replacedText).toBe('They {{0}} the ancient cave thoroughly.');
  });

  it('buildFallbackStory includes core word in synonyms and matchedWord when term has "to " prefix', () => {
    const cards = [
      {
        id: 11,
        term: 'to explore',
        definition: 'khám phá',
        partOfSpeech: 'verb',
        example: 'They explored the ancient cave thoroughly.',
        synonyms: ['investigate'],
      },
    ];

    const story = buildFallbackStory(101, cards, 'Hang động');
    const blank = story.paragraphs[0].blanks[0];
    expect(blank.matchedWord).toBe('explored');
    expect(blank.synonyms).toContain('explored');
    expect(blank.synonyms).toContain('explore');
  });

  it('buildFallbackStory sets matchedWord to term when falling back to templates', () => {
    const cards = [
      {
        id: 12,
        term: 'resilient',
        definition: 'kiên cường',
        partOfSpeech: 'adjective',
        example: '',
        synonyms: ['tough'],
      },
    ];

    const story = buildFallbackStory(102, cards, 'Template Test');
    const blank = story.paragraphs[0].blanks[0];
    expect(blank.matchedWord).toBe('resilient');
  });

  it('getContextStory calls backend API when deckId is provided', async () => {
    const mockApiResponse = {
      id: 'story-123',
      deckId: 15,
      title: 'Server Story',
      paragraphs: [
        {
          paragraphIndex: 0,
          text: 'The {{0}} was clear.',
          translation: 'Mọi thứ đã rõ ràng.',
          blanks: [
            {
              index: 0,
              cardId: 1,
              term: 'meticulous',
              definition: 'tỉ mỉ',
              partOfSpeech: 'adj',
            },
          ],
        },
      ],
      totalBlanks: 1,
    };

    const requestSpy = vi
      .spyOn(api, 'request')
      .mockResolvedValueOnce(mockApiResponse);

    const result = await contextStoryService.getContextStory(
      15,
      mockCards,
      'Test Deck'
    );

    expect(requestSpy).toHaveBeenCalledWith('/decks/15/context-story', {
      method: 'POST',
    });
    expect(result.id).toBe('story-123');
    expect(result.totalBlanks).toBe(1);
  });

  it('getContextStory falls back to local synthesis when backend call fails', async () => {
    vi.spyOn(api, 'request').mockRejectedValueOnce(
      new Error('Network error 500')
    );

    const result = await contextStoryService.getContextStory(
      20,
      mockCards,
      'Thử nghiệm'
    );

    expect(result).toBeDefined();
    expect(result.deckId).toBe(20);
    expect(result.totalBlanks).toBe(3);
    expect(result.paragraphs[0].text).toContain('{{0}}');
  });
});
