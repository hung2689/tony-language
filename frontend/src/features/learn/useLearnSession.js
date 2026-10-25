import { useReducer, useEffect, useRef, useCallback } from 'react';
import { learnReducer, INITIAL_LEARN_STATE } from '../../utils/learnReducer';
import { checkAnswer } from '../../utils/checkAnswer';
import { loadLearnSettings, saveLearnSettings } from '../../utils/learnSettings';
import { createProgressSync, generateClientAnswerId } from '../../utils/progressSync';
import { studyService } from '../../services/studyService';
import { getAccessToken } from '../../services/api';

export function useLearnSession(deck, cards = []) {
  const [state, dispatch] = useReducer(learnReducer, INITIAL_LEARN_STATE);
  const syncRef = useRef(null);
  const sessionIdRef = useRef(null);

  const getSync = useCallback(() => {
    if (!syncRef.current) {
      syncRef.current = createProgressSync({
        getAccessToken,
        fetchImpl: typeof window !== 'undefined' ? window.fetch : null,
      });
    }
    return syncRef.current;
  }, []);

  // Initialize deck data and saved options on mount / when deck changes
  useEffect(() => {
    if (deck) {
      // Guard: do not reset an active study session if deck object reference updates
      if (state.status !== 'setup') return;
      const saved = loadLearnSettings();
      dispatch({
        type: 'INIT_DECK',
        payload: { deck, cards, savedOptions: saved },
      });
    }
  }, [deck, cards, state.status]);

  // Keep progressSync updated with session ID
  const setSessionId = useCallback((id) => {
    sessionIdRef.current = id;
    getSync().setSessionId(id);
  }, [getSync]);

  // Flush answers on window pagehide / visibilitychange
  useEffect(() => {
    const handlePageHide = () => {
      getSync().flush({ keepalive: true });
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      // Also flush pending on unmount
      getSync().flush({ keepalive: true });
    };
  }, [getSync]);

  // Options update handler
  const updateOptions = useCallback((newOpts) => {
    saveLearnSettings(newOpts);
    dispatch({ type: 'UPDATE_OPTIONS', payload: newOpts });
  }, []);

  // Start session handler
  const startSession = useCallback(async () => {
    dispatch({ type: 'START_SESSION' });

    // Asynchronously create backend study session
    if (deck) {
      try {
        const plannedCount =
          state.options.countMode === 'custom'
            ? Math.min(state.options.customCount, cards.length)
            : cards.length;

        const sessionRes = await studyService.createSession({
          deckId: deck.id || null,
          direction: state.options.direction,
          plannedCount,
          order: state.options.order,
        });

        if (sessionRes?.id) {
          setSessionId(sessionRes.id);
        }
      } catch (err) {
        console.warn('Backend study session creation failed, proceeding locally:', err);
      }
    }
  }, [deck, cards, state.options, setSessionId]);

  // Submit answer
  const submitAnswer = useCallback(
    (input, responseTimeMs = 0) => {
      if (!state.currentQuestion) return;

      const card = state.currentQuestion.card;
      const direction = state.currentQuestion.direction;
      const checkResult = checkAnswer(input, card, direction, state.options, cards);
      const clientAnswerId = generateClientAnswerId();

      dispatch({
        type: 'SUBMIT_ANSWER',
        payload: {
          input,
          checkResult,
          responseTimeMs,
          clientAnswerId,
        },
      });

      // If graded (not just first almost nudge), queue answer to progressSync
      if (checkResult.result !== 'almost' || state.nudge !== null) {
        const isCorrect = checkResult.result === 'correct' || checkResult.result === 'accepted';
        getSync().enqueueAnswer({
          clientAnswerId,
          vocabularyId: card.id,
          direction,
          result: isCorrect ? 'CORRECT' : 'WRONG',
          override: false,
          userAnswer: input || '',
          responseTimeMs,
          attemptNo: state.currentQuestion.attempts ?? state.currentQuestion.attemptNo ?? 1,
        });
      }
    },
    [state.currentQuestion, state.options, state.nudge, cards, getSync]
  );

  // Skip question ("Tôi không biết")
  const skipQuestion = useCallback(
    (responseTimeMs = 0) => {
      if (!state.currentQuestion) return;

      const card = state.currentQuestion.card;
      const direction = state.currentQuestion.direction;
      const clientAnswerId = generateClientAnswerId();

      dispatch({
        type: 'SKIP_QUESTION',
        payload: { responseTimeMs, clientAnswerId },
      });

      getSync().enqueueAnswer({
        clientAnswerId,
        vocabularyId: card.id,
        direction,
        result: 'SKIPPED',
        override: false,
        userAnswer: '',
        responseTimeMs,
        attemptNo: state.currentQuestion.attempts ?? state.currentQuestion.attemptNo ?? 1,
      });
    },
    [state.currentQuestion, getSync]
  );

  // Override answer ("Tôi đã đúng")
  const overrideAnswer = useCallback(() => {
    if (!state.currentQuestion || !state.feedback) return;

    const card = state.currentQuestion.card;
    const clientAnswerId =
      state.feedback.clientAnswerId ||
      state.lastAnswerRecorded?.clientAnswerId ||
      generateClientAnswerId();

    dispatch({
      type: 'OVERRIDE_ANSWER',
      payload: { clientAnswerId },
    });

    getSync().enqueueAnswer({
      clientAnswerId,
      vocabularyId: card.id,
      direction: state.currentQuestion.direction,
      result: 'CORRECT',
      override: true,
      userAnswer: state.feedback.userAnswer || '',
      responseTimeMs: 0,
      attemptNo: state.currentQuestion.attempts ?? state.currentQuestion.attemptNo ?? 1,
    });
  }, [state.currentQuestion, state.feedback, state.lastAnswerRecorded, getSync]);

  // Next question
  const nextQuestion = useCallback(() => {
    dispatch({ type: 'NEXT_QUESTION' });
  }, []);

  // When session transitions to 'results', flush pending answers and finalize backend session
  useEffect(() => {
    if (state.status === 'results' && sessionIdRef.current) {
      const finalize = async () => {
        try {
          await getSync().flush();
          const totalQuestions = state.stats?.totalWords ?? state.sessionStats?.totalCards ?? 0;
          const correctCount = state.stats?.firstTryCorrectCount ?? state.sessionStats?.firstTryCorrectCount ?? 0;
          await studyService.finishSession(sessionIdRef.current, {
            totalQuestions,
            correctCount,
          });
        } catch (err) {
          console.warn('Error finalizing study session:', err);
        }
      };
      finalize();
    }
  }, [state.status, state.stats, state.sessionStats, getSync]);

  // Retry missed
  const retryMissed = useCallback(async () => {
    dispatch({ type: 'RETRY_MISSED' });

    if (deck) {
      try {
        const missedCount = (state.items || []).filter(
          (i) => i.wrongCount > 0 || i.firstTryCorrect === false
        ).length;

        const sessionRes = await studyService.createSession({
          deckId: deck.id || null,
          direction: state.options.direction,
          plannedCount: missedCount > 0 ? missedCount : 1,
          order: state.options.order,
        });

        if (sessionRes?.id) {
          setSessionId(sessionRes.id);
        }
      } catch (err) {
        console.warn('Backend retry study session creation failed, proceeding locally:', err);
      }
    }
  }, [deck, state.items, state.options, setSessionId]);

  // Retry all
  const retryAll = useCallback(() => {
    dispatch({ type: 'RESET_TO_SETUP' });
  }, []);

  // Flush answers on exit
  const flushOnExit = useCallback(async () => {
    await getSync().flush();
  }, [getSync]);

  return {
    state,
    updateOptions,
    startSession,
    submitAnswer,
    skipQuestion,
    overrideAnswer,
    nextQuestion,
    retryMissed,
    retryAll,
    flushOnExit,
  };
}
