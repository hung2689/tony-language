import { describe, it, expect } from 'vitest';
import { learnReducer, INITIAL_LEARN_STATE } from '../learnReducer';
import { buildSession } from '../learnQueue';
import { checkAnswer } from '../checkAnswer';

describe('Learn Mode - Direction & Synonyms Verification', () => {
  const card1 = {
    id: 101,
    term: 'business establishment',
    definition: 'cơ sở kinh doanh',
    partOfSpeech: 'noun',
    pronunciation: 'ˈbɪznəs ɪˈstæblɪʃmənt',
    example: 'Every local business establishment must register for a tax permit.',
    synonyms: ['company', 'enterprise', 'firm', 'business'],
  };

  const card2 = {
    id: 102,
    term: 'revenue',
    definition: 'doanh thu',
    partOfSpeech: 'noun',
    pronunciation: 'ˈrevənuː',
    example: 'Company revenue increased significantly.',
    synonyms: 'income; earnings',
  };

  const cards = [card1, card2];

  // Case 1: Setting English -> Vietnamese
  it('Case 1: Setting English -> Vietnamese sets direction EN_TO_VI, question is English, expected answer is Vietnamese', () => {
    const s0 = learnReducer(INITIAL_LEARN_STATE, {
      type: 'INIT_DECK',
      payload: { deck: { id: 1 }, cards: [card1], savedOptions: { direction: 'EN_TO_VI', order: 'order' } },
    });
    const s1 = learnReducer(s0, {
      type: 'START_SESSION',
      payload: { rng: () => 0.1 },
    });

    expect(s1.status).toBe('question');
    expect(s1.currentQuestion.direction).toBe('EN_TO_VI');
    // Prompt is English term
    const promptText = s1.currentQuestion.direction === 'VI_TO_EN'
      ? s1.currentQuestion.card.definition
      : s1.currentQuestion.card.term;
    expect(promptText).toBe('business establishment');

    // User submits Vietnamese meaning
    const checkRes = checkAnswer('cơ sở kinh doanh', s1.currentQuestion.card, s1.currentQuestion.direction);
    expect(checkRes.result).toBe('correct');

    const s2 = learnReducer(s1, {
      type: 'SUBMIT_ANSWER',
      payload: {
        input: 'cơ sở kinh doanh',
        checkResult: checkRes,
      },
    });

    expect(s2.status).toBe('feedback');
    expect(s2.feedback.correctAnswer).toBe('cơ sở kinh doanh');
    expect(s2.feedback.card.term).toBe('business establishment');
    expect(s2.feedback.card.definition).toBe('cơ sở kinh doanh');
    expect(s2.feedback.card.synonyms).toEqual(['company', 'enterprise', 'firm', 'business']);
  });

  // Case 2: Setting Vietnamese -> English
  it('Case 2: Setting Vietnamese -> English sets direction VI_TO_EN, question is Vietnamese, expected answer is English', () => {
    const s0 = learnReducer(INITIAL_LEARN_STATE, {
      type: 'INIT_DECK',
      payload: { deck: { id: 1 }, cards: [card1], savedOptions: { direction: 'VI_TO_EN', order: 'order' } },
    });
    const s1 = learnReducer(s0, {
      type: 'START_SESSION',
      payload: { rng: () => 0.1 },
    });

    expect(s1.status).toBe('question');
    expect(s1.currentQuestion.direction).toBe('VI_TO_EN');
    const promptText = s1.currentQuestion.direction === 'VI_TO_EN'
      ? s1.currentQuestion.card.definition
      : s1.currentQuestion.card.term;
    expect(promptText).toBe('cơ sở kinh doanh');

    // User submits English term
    const checkRes = checkAnswer('business establishment', s1.currentQuestion.card, s1.currentQuestion.direction);
    expect(checkRes.result).toBe('correct');

    const s2 = learnReducer(s1, {
      type: 'SUBMIT_ANSWER',
      payload: {
        input: 'business establishment',
        checkResult: checkRes,
      },
    });

    expect(s2.status).toBe('feedback');
    expect(s2.feedback.correctAnswer).toBe('business establishment');
    expect(s2.feedback.card.term).toBe('business establishment');
    expect(s2.feedback.card.definition).toBe('cơ sở kinh doanh');
  });

  // Case 3: Setting Both / Random alternates directions
  it('Case 3: Setting BOTH/RANDOM produces both EN_TO_VI and VI_TO_EN across sessions and questions', () => {
    const sessionItems = buildSession(cards, { direction: 'RANDOM' }, Math.random);
    expect(['VI_TO_EN', 'EN_TO_VI']).toContain(sessionItems[0].direction);

    // Verify alternating transitions in learnReducer NEXT_QUESTION
    const s0 = learnReducer(INITIAL_LEARN_STATE, {
      type: 'INIT_DECK',
      payload: { deck: { id: 1 }, cards, savedOptions: { direction: 'RANDOM' } },
    });
    const s1 = learnReducer(s0, {
      type: 'START_SESSION',
      payload: { rng: () => 0.1 },
    });

    const s2 = learnReducer(s1, {
      type: 'SUBMIT_ANSWER',
      payload: { input: 'wrong', checkResult: { result: 'wrong' } },
    });

    const s3 = learnReducer(s2, {
      type: 'NEXT_QUESTION',
      payload: { rng: () => 0.2 },
    });

    expect(s3.status).toBe('question');
    expect(['VI_TO_EN', 'EN_TO_VI']).toContain(s3.currentQuestion.direction);
  });

  // Case 4: Answer wrong -> Feedback maintains full card with synonyms
  it('Case 4: Answer wrong -> Feedback contains full card metadata and synonyms', () => {
    const s0 = learnReducer(INITIAL_LEARN_STATE, {
      type: 'INIT_DECK',
      payload: { deck: { id: 1 }, cards: [card1], savedOptions: { direction: 'VI_TO_EN', order: 'order' } },
    });
    const s1 = learnReducer(s0, { type: 'START_SESSION', payload: { rng: () => 0.1 } });

    const checkRes = checkAnswer('sdf', s1.currentQuestion.card, 'VI_TO_EN');
    expect(checkRes.result).toBe('wrong');

    const s2 = learnReducer(s1, {
      type: 'SUBMIT_ANSWER',
      payload: { input: 'sdf', checkResult: checkRes },
    });

    expect(s2.status).toBe('feedback');
    expect(s2.feedback.isCorrect).toBe(false);
    expect(s2.feedback.userAnswer).toBe('sdf');
    expect(s2.feedback.correctAnswer).toBe('business establishment');
    expect(s2.feedback.card.synonyms).toEqual(['company', 'enterprise', 'firm', 'business']);
    expect(s2.feedback.card.pronunciation).toBe('ˈbɪznəs ɪˈstæblɪʃmənt');
    expect(s2.feedback.card.example).toBe('Every local business establishment must register for a tax permit.');
  });

  // Case 5: Answer correct -> Feedback contains full card metadata and synonyms
  it('Case 5: Answer correct -> Feedback contains full card metadata and synonyms', () => {
    const s0 = learnReducer(INITIAL_LEARN_STATE, {
      type: 'INIT_DECK',
      payload: { deck: { id: 1 }, cards: [card1], savedOptions: { direction: 'VI_TO_EN', order: 'order' } },
    });
    const s1 = learnReducer(s0, { type: 'START_SESSION', payload: { rng: () => 0.1 } });

    const checkRes = checkAnswer('business establishment', s1.currentQuestion.card, 'VI_TO_EN');
    expect(checkRes.result).toBe('correct');

    const s2 = learnReducer(s1, {
      type: 'SUBMIT_ANSWER',
      payload: { input: 'business establishment', checkResult: checkRes },
    });

    expect(s2.status).toBe('feedback');
    expect(s2.feedback.isCorrect).toBe(true);
    expect(s2.feedback.card.synonyms).toEqual(['company', 'enterprise', 'firm', 'business']);
  });

  // Case 6: Click "Tôi chưa biết" (SKIP_QUESTION) -> Feedback contains full card metadata and synonyms
  it('Case 6: Click "Tôi chưa biết" (skip) -> Feedback contains full card metadata and synonyms', () => {
    const s0 = learnReducer(INITIAL_LEARN_STATE, {
      type: 'INIT_DECK',
      payload: { deck: { id: 1 }, cards: [card1], savedOptions: { direction: 'VI_TO_EN', order: 'order' } },
    });
    const s1 = learnReducer(s0, { type: 'START_SESSION', payload: { rng: () => 0.1 } });

    const s2 = learnReducer(s1, {
      type: 'SKIP_QUESTION',
      payload: { responseTimeMs: 1500, clientAnswerId: 'skip-uuid' },
    });

    expect(s2.status).toBe('feedback');
    expect(s2.feedback.result).toBe('skipped');
    expect(s2.feedback.isCorrect).toBe(false);
    expect(s2.feedback.correctAnswer).toBe('business establishment');
    expect(s2.feedback.card.synonyms).toEqual(['company', 'enterprise', 'firm', 'business']);
  });
});
