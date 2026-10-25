import { describe, it, expect } from 'vitest';
import { learnReducer, INITIAL_LEARN_STATE } from '../learnReducer';
import { TARGET_MASTERY } from '../learnQueue';

describe('learnReducer - Global Weighted Repetition Engine', () => {
  const cardA = { id: 1, term: 'hello', definition: 'xin chào' };
  const cardB = { id: 2, term: 'world', definition: 'thế giới' };
  const singleDeck = { id: 10, name: 'Basic Deck' };

  function initSessionState(cards = [cardA, cardB]) {
    const s0 = learnReducer(INITIAL_LEARN_STATE, {
      type: 'INIT_DECK',
      payload: { deck: singleDeck, cards },
    });
    return learnReducer(s0, {
      type: 'START_SESSION',
      payload: {
        rng: () => 0.5,
        now: 1000,
      },
    });
  }

  it('1. START_SESSION initializes global pool and picks first question', () => {
    const state = initSessionState();
    expect(state.status).toBe('question');
    expect(state.currentItem).not.toBeNull();
    expect(state.currentQuestion).not.toBeNull();
    expect(state.items).toHaveLength(2);
    expect(state.currentTurn).toBe(1);
    expect(state.stats.totalWords).toBe(2);
    expect(state.stats.masteredWords).toBe(0);
    expect(state.stats.firstTryCorrectCount).toBe(0);
    expect(state.stats.totalAttempts).toBe(0);
  });

  it('2. Evaluated Correct advances to feedback and increments masteryLevel and firstTryCorrectCount', () => {
    let state = initSessionState();
    const currentCardId = state.currentItem.cardId;

    state = learnReducer(state, {
      type: 'SUBMIT_ANSWER',
      payload: {
        input: 'hello',
        checkResult: { result: 'correct' },
        responseTimeMs: 1200,
        clientAnswerId: 'uuid-1',
      },
    });

    expect(state.status).toBe('feedback');
    expect(state.lastFeedback.result).toBe('correct');
    expect(state.feedback.result).toBe('correct');
    expect(state.currentItem.cardId).toBe(currentCardId);
    expect(state.currentItem.masteryLevel).toBe(1);
    expect(state.currentItem.wrongCount).toBe(0);
    expect(state.currentItem.attempts).toBe(1);
    expect(state.currentItem.firstTryCorrect).toBe(true);

    const updatedInItems = state.items.find((i) => i.cardId === currentCardId);
    expect(updatedInItems.masteryLevel).toBe(1);
    expect(updatedInItems.firstTryCorrect).toBe(true);

    expect(state.stats.firstTryCorrectCount).toBe(1);
    expect(state.stats.totalAttempts).toBe(1);
  });

  it('3. Evaluated Wrong advances to feedback, increments wrongCount and sets firstTryCorrect to false', () => {
    let state = initSessionState();
    const currentCardId = state.currentItem.cardId;

    state = learnReducer(state, {
      type: 'SUBMIT_ANSWER',
      payload: {
        input: 'wrong answer',
        checkResult: { result: 'wrong' },
        responseTimeMs: 800,
        clientAnswerId: 'uuid-2',
      },
    });

    expect(state.status).toBe('feedback');
    expect(state.lastFeedback.result).toBe('wrong');
    expect(state.currentItem.wrongCount).toBe(1);
    expect(state.currentItem.masteryLevel).toBe(0);
    expect(state.currentItem.attempts).toBe(1);
    expect(state.currentItem.firstTryCorrect).toBe(false);

    const updatedInItems = state.items.find((i) => i.cardId === currentCardId);
    expect(updatedInItems.wrongCount).toBe(1);
    expect(updatedInItems.firstTryCorrect).toBe(false);

    expect(state.stats.firstTryCorrectCount).toBe(0);
    expect(state.stats.totalAttempts).toBe(1);
  });

  it('4. Nudge lifecycle: first almost gives nudge without grading; second almost is graded as wrong', () => {
    let state = initSessionState();
    const currentCardId = state.currentItem.cardId;

    // 1. First attempt: almost
    state = learnReducer(state, {
      type: 'SUBMIT_ANSWER',
      payload: {
        input: 'helllo',
        checkResult: { result: 'almost', message: 'Gần đúng rồi!' },
        responseTimeMs: 900,
      },
    });

    // Stays on question status with nudge set
    expect(state.status).toBe('question');
    expect(state.nudgedCardId).toBe(currentCardId);
    expect(state.nudge).not.toBeNull();
    expect(state.nudge.message).toBe('Gần đúng rồi!');
    expect(state.stats.totalAttempts).toBe(0); // Not counted yet

    // 2. Second attempt with almost on same card: graded as wrong
    state = learnReducer(state, {
      type: 'SUBMIT_ANSWER',
      payload: {
        input: 'helllo',
        checkResult: { result: 'almost' },
        responseTimeMs: 1100,
        clientAnswerId: 'uuid-graded-almost',
      },
    });

    expect(state.status).toBe('feedback');
    expect(state.lastFeedback.result).toBe('wrong');
    expect(state.nudgedCardId).toBeNull();
    expect(state.nudge).toBeNull();
    expect(state.currentItem.wrongCount).toBe(1);
    expect(state.currentItem.firstTryCorrect).toBe(false);
    expect(state.stats.totalAttempts).toBe(1);
  });

  it('5. Override lifecycle: decrements wrongCount, awards +2 masteryLevel (capped at 3), repairs firstTryCorrect if attempt 1', () => {
    let state = initSessionState();

    // 1. First attempt marked wrong
    state = learnReducer(state, {
      type: 'SUBMIT_ANSWER',
      payload: {
        input: 'hi',
        checkResult: { result: 'wrong' },
        clientAnswerId: 'uuid-wrong',
      },
    });

    expect(state.currentItem.wrongCount).toBe(1);
    expect(state.currentItem.masteryLevel).toBe(0);
    expect(state.currentItem.firstTryCorrect).toBe(false);
    expect(state.stats.firstTryCorrectCount).toBe(0);

    // 2. User clicks Override ("Tôi đã đúng")
    state = learnReducer(state, {
      type: 'OVERRIDE_CORRECT',
      payload: { clientAnswerId: 'uuid-wrong' },
    });

    expect(state.feedback.result).toBe('correct');
    expect(state.feedback.override).toBe(true);
    expect(state.currentItem.wrongCount).toBe(0); // 1 - 1 = 0
    expect(state.currentItem.masteryLevel).toBe(2); // 0 + 2 = 2
    expect(state.currentItem.firstTryCorrect).toBe(true); // Repaired for attempt 1
    expect(state.stats.firstTryCorrectCount).toBe(1);
  });

  it('6. NEXT_QUESTION picks next card enforcing anti-echo cooldown between multiple candidates', () => {
    let state = initSessionState();
    const firstCardId = state.currentItem.cardId;

    // Answer first question
    state = learnReducer(state, {
      type: 'SUBMIT_ANSWER',
      payload: { input: 'hello', checkResult: { result: 'correct' } },
    });

    // Move to next question with deterministic RNG
    state = learnReducer(state, {
      type: 'NEXT_QUESTION',
      payload: { rng: () => 0.1 },
    });

    expect(state.status).toBe('question');
    // Anti-echo cooldown ensures current card is NOT the same as firstCardId
    expect(state.currentItem.cardId).not.toBe(firstCardId);
    expect(state.currentTurn).toBe(2);
    expect(state.lastFeedback).toBeNull();
  });

  it('7. Single-card deck: missed card is repeated immediately despite anti-echo cooldown (last-man standing)', () => {
    let state = initSessionState([cardA]);
    expect(state.items).toHaveLength(1);

    // Miss card A
    state = learnReducer(state, {
      type: 'SUBMIT_ANSWER',
      payload: { input: 'bye', checkResult: { result: 'wrong' } },
    });

    expect(state.status).toBe('feedback');
    expect(state.currentItem.wrongCount).toBe(1);

    // Next question immediately returns card A because it is the only remaining unmastered card
    state = learnReducer(state, { type: 'NEXT_QUESTION', payload: { rng: () => 0.1 } });
    expect(state.status).toBe('question');
    expect(state.currentItem.cardId).toBe(cardA.id);
  });

  it('8. Session termination: transitions to results when all cards reach TARGET_MASTERY (3)', () => {
    let state = initSessionState([cardA]);

    // Card A: Turn 1 (Mastery -> 1)
    state = learnReducer(state, {
      type: 'SUBMIT_ANSWER',
      payload: { input: 'hello', checkResult: { result: 'correct' } },
    });
    expect(state.currentItem.masteryLevel).toBe(1);
    state = learnReducer(state, { type: 'NEXT_QUESTION' });

    // Card A: Turn 2 (Mastery -> 2)
    state = learnReducer(state, {
      type: 'SUBMIT_ANSWER',
      payload: { input: 'hello', checkResult: { result: 'correct' } },
    });
    expect(state.currentItem.masteryLevel).toBe(2);
    state = learnReducer(state, { type: 'NEXT_QUESTION' });

    // Card A: Turn 3 (Mastery -> 3: TARGET_MASTERY reached!)
    state = learnReducer(state, {
      type: 'SUBMIT_ANSWER',
      payload: { input: 'hello', checkResult: { result: 'correct' } },
    });
    expect(state.currentItem.masteryLevel).toBe(3);
    expect(state.stats.masteredWords).toBe(1);

    // NEXT_QUESTION detects candidate pool is empty -> transitions to results
    state = learnReducer(state, {
      type: 'NEXT_QUESTION',
      payload: { now: 5000 },
    });

    expect(state.status).toBe('results');
    expect(state.currentItem).toBeNull();
    expect(state.currentQuestion).toBeNull();
    expect(state.stats.masteredWords).toBe(1);
    expect(state.stats.endTime).toBe(5000);
  });

  it('9. RETRY_MISSED creates a new session containing only cards that had wrong attempts', () => {
    let state = initSessionState([cardA, cardB]);

    // 1. Answer cardA wrong
    state = learnReducer(state, {
      type: 'SUBMIT_ANSWER',
      payload: { input: 'wrong', checkResult: { result: 'wrong' } },
    });
    // Override it or graduate it so session moves forward
    state = learnReducer(state, {
      type: 'OVERRIDE_CORRECT',
    });
    // Manually mark cardA wrongCount = 1 to verify filter
    state.items[0].wrongCount = 1;
    state.items[0].masteryLevel = TARGET_MASTERY;
    // Mark cardB perfect
    state.items[1].wrongCount = 0;
    state.items[1].masteryLevel = TARGET_MASTERY;

    // Retry missed
    state = learnReducer(state, {
      type: 'RETRY_MISSED',
      payload: { rng: () => 0.5 },
    });

    expect(state.status).toBe('question');
    expect(state.items).toHaveLength(1);
    expect(state.items[0].cardId).toBe(cardA.id);
    expect(state.items[0].masteryLevel).toBe(0);
    expect(state.items[0].wrongCount).toBe(0);
  });
});
