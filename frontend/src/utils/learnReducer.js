import { TARGET_MASTERY, pickNextItem, buildSession } from './learnQueue';

export const INITIAL_LEARN_STATE = {
  status: 'setup', // 'setup' | 'question' | 'feedback' | 'results'
  options: {
    countMode: 'all',
    customCount: 10,
    order: 'random',
    direction: 'VI_TO_EN',
    autoSpeak: true,
    soundEffects: true,
    ignoreDiacritics: false,
    autoAdvance: false,
  },
  deck: null,
  cards: [],
  queue: [],
  items: [],
  currentItem: null,
  currentTurn: 0,
  nudgedCardId: null,
  lastFeedback: null,
  // Backwards compatibility aliases for existing UI consumers:
  currentQuestion: null,
  feedback: null,
  nudge: null,
  distinctCardIdsShown: [],
  masteredIds: [],
  cardStats: {},
  stats: {
    totalWords: 0,
    masteredWords: 0,
    totalAttempts: 0,
    firstTryCorrectCount: 0,
    startTime: null,
    endTime: null,
  },
  sessionStats: {
    totalCards: 0,
    totalAttempts: 0,
    firstTryCorrectCount: 0,
    masteredCount: 0,
    startTime: null,
    endTime: null,
  },
  lastAnswerRecorded: null,
};

export function learnReducer(state, action) {
  switch (action.type) {
    case 'INIT_DECK': {
      const { deck, cards, savedOptions } = action.payload || {};
      const workingCards = Array.isArray(cards) ? cards : [];
      return {
        ...INITIAL_LEARN_STATE,
        deck: deck || null,
        cards: workingCards,
        options: {
          ...INITIAL_LEARN_STATE.options,
          ...(savedOptions || {}),
        },
      };
    }

    case 'UPDATE_OPTIONS': {
      return {
        ...state,
        options: {
          ...state.options,
          ...action.payload,
        },
      };
    }

    case 'START_SESSION': {
      const rng = action.payload?.rng || Math.random;
      const now = action.payload?.now || Date.now();

      // Use explicit items if passed in payload; otherwise build from cards & options
      let sessionItems = action.payload?.items;
      if (!Array.isArray(sessionItems)) {
        sessionItems = buildSession(state.cards, state.options, rng);
      }

      if (sessionItems.length === 0) {
        return {
          ...state,
          status: 'results',
          items: [],
          currentItem: null,
          currentQuestion: null,
          currentTurn: 0,
        };
      }

      const firstItem = pickNextItem(sessionItems, null, rng);
      if (!firstItem) {
        return {
          ...state,
          status: 'results',
          items: sessionItems,
          currentItem: null,
          currentQuestion: null,
          currentTurn: 0,
        };
      }

      const masteredCount = sessionItems.filter((i) => i.masteryLevel >= TARGET_MASTERY).length;
      const stats = {
        totalWords: sessionItems.length,
        masteredWords: masteredCount,
        totalAttempts: 0,
        firstTryCorrectCount: 0,
        startTime: now,
        endTime: null,
        // UI aliases:
        totalCards: sessionItems.length,
        masteredCount: masteredCount,
      };

      const cardStats = {};
      sessionItems.forEach((item) => {
        cardStats[item.cardId] = {
          card: item.card,
          wrongCount: item.wrongCount,
          masteryLevel: item.masteryLevel,
          mastered: item.masteryLevel >= TARGET_MASTERY,
          firstTryCorrect: item.firstTryCorrect,
          attempts: item.attempts,
        };
      });

      return {
        ...state,
        status: 'question',
        items: sessionItems,
        currentItem: firstItem,
        currentQuestion: firstItem,
        currentTurn: 1,
        distinctCardIdsShown: [firstItem.cardId],
        nudgedCardId: null,
        lastFeedback: null,
        feedback: null,
        nudge: null,
        stats,
        sessionStats: stats,
        cardStats,
        lastAnswerRecorded: null,
      };
    }

    case 'SUBMIT_ANSWER': {
      if (state.status !== 'question' || !state.currentItem) {
        return state;
      }

      const payload = action.payload || {};
      const current = state.currentItem;
      const clientAnswerId = payload.clientAnswerId;
      const responseTimeMs = payload.responseTimeMs || 0;

      // Extract result from payload (supports both { result, userAnswer, matched } and checkResult)
      let evalResult = payload.result;
      if (!evalResult && payload.checkResult) {
        evalResult = payload.checkResult.result;
      }
      if (!evalResult) {
        evalResult = 'wrong';
      }

      const userAnswer = payload.userAnswer ?? payload.input ?? '';
      const matched = payload.matched ?? payload.checkResult?.matched ?? null;
      const nudgeMessage =
        payload.message ??
        payload.checkResult?.message ??
        payload.reason ??
        payload.checkResult?.reason ??
        'Gần đúng! Hãy kiểm tra lại câu trả lời.';

      // --- Nudge Branch (result === 'almost') ---
      if (evalResult === 'almost') {
        if (state.nudgedCardId !== current.cardId) {
          // First nudge on this turn: do not mutate stats/attempts/masteryLevel
          const lastFeedback = {
            result: 'almost',
            userAnswer,
            matched,
            reason: nudgeMessage,
            message: nudgeMessage,
          };
          const nudgeObj = {
            message: nudgeMessage,
            reason: nudgeMessage,
            matched,
            input: userAnswer,
            toString() {
              return this.message;
            },
          };
          return {
            ...state,
            nudgedCardId: current.cardId,
            lastFeedback,
            feedback: lastFeedback,
            nudge: nudgeObj,
            status: 'question',
          };
        }
        // Second almost on same card: fall through to evaluated wrong
        evalResult = 'wrong';
      }

      // --- Evaluated Branch ('correct', 'accepted' or 'wrong' / 'skipped') ---
      const isCorrect = evalResult === 'correct' || evalResult === 'accepted';
      const isFirstAttempt = current.attempts === 0;

      let nextMastery = current.masteryLevel;
      let nextWrongCount = current.wrongCount;
      let nextFirstTry = current.firstTryCorrect;

      if (isCorrect) {
        nextMastery = Math.min(TARGET_MASTERY, current.masteryLevel + 1);
        nextFirstTry = isFirstAttempt ? true : current.firstTryCorrect;
      } else {
        nextMastery = Math.max(0, current.masteryLevel - 1);
        nextWrongCount = current.wrongCount + 1;
        nextFirstTry = isFirstAttempt ? false : current.firstTryCorrect;
      }

      const updatedItem = {
        ...current,
        attempts: current.attempts + 1,
        attemptNo: current.attempts + 1,
        masteryLevel: nextMastery,
        wrongCount: nextWrongCount,
        firstTryCorrect: nextFirstTry,
      };

      const nextItems = state.items.map((item) =>
        item.cardId === current.cardId ? updatedItem : item
      );

      const masteredWords = nextItems.filter((i) => i.masteryLevel >= TARGET_MASTERY).length;
      const firstTryCount = nextItems.filter((i) => i.firstTryCorrect === true).length;
      const totalAttempts = (state.stats?.totalAttempts || 0) + 1;

      const updatedStats = {
        ...state.stats,
        totalWords: nextItems.length,
        masteredWords,
        firstTryCorrectCount: firstTryCount,
        totalAttempts,
        // UI aliases
        totalCards: nextItems.length,
        masteredCount: masteredWords,
      };

      const correctAnswerText =
        current.direction === 'VI_TO_EN' ? current.card.term : current.card.definition;

      const lastFeedback = {
        clientAnswerId,
        result: evalResult === 'skipped' ? 'skipped' : (isCorrect ? (evalResult === 'accepted' ? 'accepted' : 'correct') : 'wrong'),
        isCorrect,
        userAnswer: evalResult === 'skipped' ? null : userAnswer,
        correctAnswer: correctAnswerText,
        matched: matched || payload.checkResult?.matchedText || null,
        matchedText: payload.checkResult?.matchedText || matched || null,
        via: payload.checkResult?.via || null,
        note: payload.checkResult?.note || null,
        card: current.card,
        direction: current.direction,
        override: false,
        alsoCorrect: payload.checkResult?.alsoCorrect || null,
      };

      const cardStats = {};
      nextItems.forEach((item) => {
        cardStats[item.cardId] = {
          card: item.card,
          wrongCount: item.wrongCount,
          masteryLevel: item.masteryLevel,
          mastered: item.masteryLevel >= TARGET_MASTERY,
          firstTryCorrect: item.firstTryCorrect,
          attempts: item.attempts,
        };
      });

      return {
        ...state,
        status: 'feedback',
        items: nextItems,
        currentItem: updatedItem,
        currentQuestion: updatedItem,
        nudgedCardId: null,
        nudge: null,
        lastFeedback,
        feedback: lastFeedback,
        stats: updatedStats,
        sessionStats: updatedStats,
        cardStats,
        lastAnswerRecorded: {
          clientAnswerId,
          vocabularyId: current.cardId,
          direction: current.direction,
          result: isCorrect ? 'CORRECT' : evalResult === 'skipped' ? 'SKIPPED' : 'WRONG',
          via: payload.checkResult?.via || null,
          matchedText: payload.checkResult?.matchedText || null,
          note: payload.checkResult?.note || null,
          override: false,
          userAnswer: evalResult === 'skipped' ? '' : userAnswer,
          responseTimeMs,
          attemptNo: updatedItem.attempts,
        },
      };
    }

    case 'SKIP_QUESTION': {
      if (state.status !== 'question' || !state.currentItem) {
        return state;
      }
      return learnReducer(state, {
        type: 'SUBMIT_ANSWER',
        payload: {
          result: 'skipped',
          userAnswer: null,
          clientAnswerId: action.payload?.clientAnswerId,
          responseTimeMs: action.payload?.responseTimeMs || 0,
        },
      });
    }

    case 'OVERRIDE_CORRECT':
    case 'OVERRIDE_ANSWER': {
      // Guard: Only valid when status === 'feedback' and last feedback was wrong or skipped
      const currentResult = state.lastFeedback?.result || state.feedback?.result;
      if (state.status !== 'feedback' || (currentResult !== 'wrong' && currentResult !== 'skipped')) {
        return state;
      }

      const current = state.currentItem;
      if (!current) return state;

      const wrongCount = Math.max(0, current.wrongCount - 1);
      const masteryLevel = Math.min(TARGET_MASTERY, current.masteryLevel + 2);
      const firstTryCorrect = current.attempts === 1 ? true : current.firstTryCorrect;

      const updatedItem = {
        ...current,
        wrongCount,
        masteryLevel,
        firstTryCorrect,
        attempts: current.attempts,
        attemptNo: current.attempts,
      };

      const nextItems = state.items.map((item) =>
        item.cardId === current.cardId ? updatedItem : item
      );

      const masteredWords = nextItems.filter((i) => i.masteryLevel >= TARGET_MASTERY).length;
      const firstTryCount = nextItems.filter((i) => i.firstTryCorrect === true).length;

      const updatedStats = {
        ...state.stats,
        masteredWords,
        firstTryCorrectCount: firstTryCount,
        masteredCount: masteredWords,
      };

      const lastFeedback = {
        ...(state.lastFeedback || state.feedback || {}),
        result: 'correct',
        override: true,
        overridden: true,
      };

      const cardStats = {};
      nextItems.forEach((item) => {
        cardStats[item.cardId] = {
          card: item.card,
          wrongCount: item.wrongCount,
          masteryLevel: item.masteryLevel,
          mastered: item.masteryLevel >= TARGET_MASTERY,
          firstTryCorrect: item.firstTryCorrect,
          attempts: item.attempts,
        };
      });

      return {
        ...state,
        items: nextItems,
        currentItem: updatedItem,
        currentQuestion: updatedItem,
        lastFeedback,
        feedback: lastFeedback,
        stats: updatedStats,
        sessionStats: updatedStats,
        cardStats,
        lastAnswerRecorded: {
          clientAnswerId: action.payload?.clientAnswerId,
          vocabularyId: current.cardId,
          direction: current.direction,
          result: 'CORRECT',
          override: true,
          userAnswer: state.lastFeedback?.userAnswer || '',
          responseTimeMs: 0,
          attemptNo: current.attempts,
        },
      };
    }

    case 'NEXT_QUESTION': {
      if (state.status !== 'feedback') {
        return state;
      }

      const rng = action.payload?.rng || Math.random;
      const now = action.payload?.now || Date.now();
      const lastCardId = state.currentItem?.cardId ?? null;

      const nextItem = pickNextItem(state.items, lastCardId, rng);

      if (nextItem === null) {
        // Session termination: all cards have reached TARGET_MASTERY!
        const finalStats = {
          ...state.stats,
          endTime: now,
        };
        return {
          ...state,
          status: 'results',
          currentItem: null,
          currentQuestion: null,
          lastFeedback: null,
          feedback: null,
          nudgedCardId: null,
          nudge: null,
          stats: finalStats,
          sessionStats: finalStats,
        };
      }

      const nextDistinct = Array.from(
        new Set([...(state.distinctCardIdsShown || []), nextItem.cardId])
      );

      return {
        ...state,
        status: 'question',
        currentItem: nextItem,
        currentQuestion: nextItem,
        currentTurn: (state.currentTurn || 1) + 1,
        distinctCardIdsShown: nextDistinct,
        lastFeedback: null,
        feedback: null,
        nudgedCardId: null,
        nudge: null,
      };
    }

    case 'RETRY_MISSED': {
      const missedCards = state.items
        .filter((i) => i.wrongCount > 0 || i.firstTryCorrect === false)
        .map((i) => i.card);

      if (missedCards.length === 0) {
        return state;
      }

      const rng = action.payload?.rng || Math.random;
      const now = action.payload?.now || Date.now();
      const newItems = buildSession(missedCards, state.options, rng);

      return learnReducer(
        { ...state, cards: missedCards },
        {
          type: 'START_SESSION',
          payload: { items: newItems, rng, now },
        }
      );
    }

    case 'RESET_TO_SETUP': {
      return {
        ...state,
        status: 'setup',
        currentItem: null,
        currentQuestion: null,
        lastFeedback: null,
        feedback: null,
        nudgedCardId: null,
        nudge: null,
      };
    }

    default:
      return state;
  }
}
