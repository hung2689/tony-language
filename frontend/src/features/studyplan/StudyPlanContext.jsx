import {
  createContext,
  useContext,
  useState,
  useReducer,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { studyPlanService, clearStudyPlanQueueCache } from '../../services/studyPlanService';
import { useAuth } from '../auth/AuthContext';
import {
  studyPlanReducer,
  initialStudyPlanState,
  selectDisplayPlan,
} from './studyPlanReducer';

const StudyPlanContext = createContext(null);

/**
 * Checks whether a study plan is currently in ACTIVE status.
 * Reusable helper across study plan features (BUG-15).
 */
export const isPlanActive = (plan) => Boolean(plan && plan.status === 'ACTIVE');

const UNDO_TOAST_DURATION_MS = 5500;
const INFO_TOAST_DURATION_MS = 3500;

export function StudyPlanProvider({ children }) {
  const { user } = useAuth();
  const [planState, dispatch] = useReducer(studyPlanReducer, initialStudyPlanState);
  const [todayQueue, setTodayQueue] = useState(null);
  const [todayQueueVersion, setTodayQueueVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  // App-level Toast state (survives route navigation)
  // { id, type: 'undo' | 'info' | 'error', message: string, removedItems: Array<{ id, name, sortOrder }> }
  const [toastState, setToastState] = useState(null);
  const toastTimerRef = useRef(null);

  // Sequential Promise queue for all mutations (prevents out-of-order execution and queue poisoning)
  const queueRef = useRef(Promise.resolve());

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalInitialDeckId, setCreateModalInitialDeckId] = useState(null);

  const [isAddDecksModalOpen, setIsAddDecksModalOpen] = useState(false);
  const [addDecksTargetDeckIds, setAddDecksTargetDeckIds] = useState([]);

  // Gate dismissal state (persists per session)
  const [isGateDismissed, setIsGateDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('study_plan_gate_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const activePlan = useMemo(() => selectDisplayPlan(planState), [planState]);
  const isMutatingDecks = planState.pendingOps.length > 0;

  const clearToastTimer = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, []);

  const dismissToast = useCallback(() => {
    clearToastTimer();
    setToastState(null);
  }, [clearToastTimer]);

  const showUndoToast = useCallback(
    ({ removedItems = [] }) => {
      if (!removedItems || removedItems.length === 0) return;
      clearToastTimer();

      setToastState((prev) => {
        // Accumulate if previous toast is still an active undo toast
        const prevItems = prev?.type === 'undo' && Array.isArray(prev.removedItems) ? prev.removedItems : [];
        const mergedMap = new Map();
        for (const item of [...prevItems, ...removedItems]) {
          if (item && item.id != null && !mergedMap.has(item.id)) {
            mergedMap.set(item.id, item);
          }
        }
        const mergedItems = Array.from(mergedMap.values());
        const count = mergedItems.length;
        const message =
          count === 1 && mergedItems[0].name
            ? `Đã gỡ bộ từ "${mergedItems[0].name}" khỏi lộ trình. Lịch sử ghi nhớ SM-2 vẫn được bảo toàn.`
            : `Đã gỡ ${count} bộ từ khỏi lộ trình. Lịch sử ghi nhớ SM-2 vẫn được bảo toàn.`;

        return {
          id: Date.now(),
          type: 'undo',
          message,
          removedItems: mergedItems,
        };
      });

      toastTimerRef.current = setTimeout(() => {
        setToastState(null);
      }, UNDO_TOAST_DURATION_MS);
    },
    [clearToastTimer]
  );

  const showInfoToast = useCallback(
    (message) => {
      clearToastTimer();
      setToastState({
        id: Date.now(),
        type: 'info',
        message,
        removedItems: [],
      });
      toastTimerRef.current = setTimeout(() => {
        setToastState(null);
      }, INFO_TOAST_DURATION_MS);
    },
    [clearToastTimer]
  );

  const showErrorToast = useCallback(
    (message) => {
      clearToastTimer();
      setToastState({
        id: Date.now(),
        type: 'error',
        message,
        removedItems: [],
      });
      toastTimerRef.current = setTimeout(() => {
        setToastState(null);
      }, INFO_TOAST_DURATION_MS + 1000);
    },
    [clearToastTimer]
  );

  useEffect(() => {
    return () => clearToastTimer();
  }, [clearToastTimer]);

  /**
   * Enqueues an async mutation task sequentially.
   * Poisoning-proof: queueRef.current always catches rejections so subsequent tasks still run.
   */
  const enqueue = useCallback((task) => {
    const run = queueRef.current.then(task);
    queueRef.current = run.catch(() => {});
    return run;
  }, []);

  const refreshTodayQueueSilently = useCallback(async (planToCheck) => {
    clearStudyPlanQueueCache();
    if (!isPlanActive(planToCheck)) {
      setTodayQueue(null);
      return null;
    }
    if (Array.isArray(planToCheck.decks) && planToCheck.decks.length === 0) {
      const emptyQueue = {
        planId: planToCheck.id,
        planName: planToCheck.name,
        cards: [],
        dueWords: 0,
        weakWords: 0,
        newWords: 0,
        totalWords: 0,
      };
      setTodayQueue(emptyQueue);
      return emptyQueue;
    }
    try {
      const queueRes = await studyPlanService.getTodayQueue({ skipCache: true });
      setTodayQueue(queueRes || null);
      return queueRes;
    } catch {
      return null;
    }
  }, []);

  /**
   * Contract for refetchPlanSilently:
   * 1. Fetches latest plan from server and dispatches SET_SERVER_PLAN (guarded by pickNewerPlan)
   * 2. Returns true if ANY id in targetIds still exists in the server plan's decks
   */
  const refetchPlanSilently = useCallback(
    async (targetIds = []) => {
      const latestPlan = await studyPlanService.getCurrentPlan();
      dispatch({ type: 'SET_SERVER_PLAN', plan: latestPlan });
      if (!latestPlan || !Array.isArray(latestPlan.decks)) return false;
      const deckIdSet = new Set(latestPlan.decks.map((d) => d.id));
      return targetIds.some((id) => deckIdSet.has(id));
    },
    []
  );

  // Keep latest handlers in a ref updated via useLayoutEffect (safe for concurrent rendering & no stale closures)
  const handlersRef = useRef({
    refetchPlanSilently,
    refreshTodayQueueSilently,
    showUndoToast,
    showInfoToast,
    showErrorToast,
    activePlan,
  });

  useLayoutEffect(() => {
    handlersRef.current = {
      refetchPlanSilently,
      refreshTodayQueueSilently,
      showUndoToast,
      showInfoToast,
      showErrorToast,
      activePlan,
    };
  });

  const refreshPlan = useCallback(async () => {
    if (!user) {
      dispatch({ type: 'RESET_PLAN' });
      setTodayQueue(null);
      return;
    }
    setLoading(true);
    try {
      const plan = await studyPlanService.getCurrentPlan();
      dispatch({ type: 'SET_SERVER_PLAN', plan });
      if (isPlanActive(plan)) {
        const queueRes = await studyPlanService.getTodayQueue({ skipCache: true });
        setTodayQueue(queueRes || null);
      } else {
        setTodayQueue(null);
      }
    } catch {
      dispatch({ type: 'RESET_PLAN' });
      setTodayQueue(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshPlan();
  }, [refreshPlan]);

  const updateActivePlanDirectly = useCallback(
    (updatedPlan) => {
      dispatch({ type: 'SET_SERVER_PLAN', plan: updatedPlan });
      setTodayQueueVersion((v) => v + 1);
      handlersRef.current.refreshTodayQueueSilently(updatedPlan);
    },
    []
  );

  /**
   * Optimistically removes 1 or more decks from the active plan.
   * Immediate UI update (<16ms) + Sequential server commit via enqueue.
   */
  const removeDecks = useCallback(
    (ids, deckMetaList = []) => {
      const uniqueIds = Array.from(new Set((ids || []).filter((id) => id != null)));
      if (uniqueIds.length === 0) return Promise.resolve();

      const currentDecks = handlersRef.current.activePlan?.decks || [];
      const removedItems =
        deckMetaList.length > 0
          ? deckMetaList
          : currentDecks
              .filter((d) => uniqueIds.includes(d.id))
              .map((d) => ({
                id: d.id,
                name: d.name,
                sortOrder: d.sortOrder ?? 0,
              }));

      const opId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      dispatch({ type: 'OP_ADD', opId, ids: uniqueIds });

      return enqueue(async () => {
        try {
          const updatedPlan = await studyPlanService.removeDecksFromPlan(uniqueIds);
          dispatch({ type: 'OP_DONE', opId, plan: updatedPlan });
          setTodayQueueVersion((v) => v + 1);
          handlersRef.current.refreshTodayQueueSilently(updatedPlan);
          handlersRef.current.showUndoToast({ removedItems });
        } catch {
          let stillExists = true;
          try {
            stillExists = await handlersRef.current.refetchPlanSilently(uniqueIds);
          } catch {
            /* Keep stillExists = true when completely offline */
          }
          if (stillExists) {
            handlersRef.current.showErrorToast(
              'Không thể gỡ bộ từ khỏi lộ trình, vui lòng thử lại.'
            );
          } else {
            setTodayQueueVersion((v) => v + 1);
            handlersRef.current.showUndoToast({ removedItems });
          }
        } finally {
          dispatch({ type: 'OP_REMOVE_PENDING', opId });
        }
      });
    },
    [enqueue]
  );

  /**
   * Undoes the most recent removal(s) accumulated in the Undo Toast,
   * restoring exact sortOrder positions via the same sequential queue.
   */
  const undoLastRemove = useCallback(() => {
    if (!toastState || toastState.type !== 'undo' || !toastState.removedItems?.length) {
      return Promise.resolve();
    }

    const itemsToRestore = [...toastState.removedItems];
    dismissToast();
    setIsUndoing(true);

    return enqueue(async () => {
      try {
        const currentDeckIds = new Set(
          (handlersRef.current.activePlan?.decks || []).map((d) => d.id)
        );
        const filteredItems = itemsToRestore.filter((item) => !currentDeckIds.has(item.id));
        if (filteredItems.length === 0) {
          handlersRef.current.showInfoToast('Các bộ từ đã có sẵn trong lộ trình.');
          return;
        }

        const deckIds = filteredItems.map((item) => item.id);
        const deckPositions = filteredItems.map((item) => ({
          deckId: item.id,
          sortOrder: item.sortOrder ?? 0,
        }));

        const updatedPlan = await studyPlanService.addDecksToActivePlan({
          deckIds,
          deckPositions,
        });

        dispatch({ type: 'SET_SERVER_PLAN', plan: updatedPlan });
        setTodayQueueVersion((v) => v + 1);
        handlersRef.current.refreshTodayQueueSilently(updatedPlan);

        const totalRequested = filteredItems.length;
        const actualRestored =
          typeof updatedPlan?.restoredCount === 'number'
            ? updatedPlan.restoredCount
            : totalRequested;

        if (actualRestored >= totalRequested) {
          handlersRef.current.showInfoToast(
            totalRequested === 1
              ? `Đã khôi phục bộ từ "${filteredItems[0].name}" về đúng vị trí cũ.`
              : `Đã khôi phục ${actualRestored} bộ từ về đúng vị trí cũ.`
          );
        } else if (actualRestored > 0) {
          handlersRef.current.showInfoToast(
            `Đã khôi phục ${actualRestored}/${totalRequested} bộ từ (các bộ còn lại không còn tồn tại).`
          );
        } else {
          handlersRef.current.showErrorToast('Không thể khôi phục vì bộ từ không còn tồn tại.');
        }
      } catch {
        handlersRef.current.showErrorToast('Không thể hoàn tác lúc này, vui lòng thử lại.');
      } finally {
        setIsUndoing(false);
      }
    });
  }, [toastState, dismissToast, enqueue]);

  /**
   * Adds decks through the sequential mutation queue and updates state directly from response.
   */
  const addDecksToPlan = useCallback(
    (payload) => {
      return enqueue(async () => {
        const updatedPlan = await studyPlanService.addDecksToActivePlan(payload);
        dispatch({ type: 'SET_SERVER_PLAN', plan: updatedPlan });
        setTodayQueueVersion((v) => v + 1);
        handlersRef.current.refreshTodayQueueSilently(updatedPlan);
        return updatedPlan;
      });
    },
    [enqueue]
  );

  /**
   * Updates plan settings through the sequential mutation queue and updates state directly from response.
   */
  const updatePlanSettings = useCallback(
    (payload) => {
      return enqueue(async () => {
        const updatedPlan = await studyPlanService.updatePlan(payload);
        dispatch({ type: 'SET_SERVER_PLAN', plan: updatedPlan });
        setTodayQueueVersion((v) => v + 1);
        handlersRef.current.refreshTodayQueueSilently(updatedPlan);
        return updatedPlan;
      });
    },
    [enqueue]
  );

  const openCreateModal = (initialDeckId = null) => {
    setCreateModalInitialDeckId(initialDeckId);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateModalInitialDeckId(null);
  };

  const openAddDecksModal = (deckIds = []) => {
    setAddDecksTargetDeckIds(Array.isArray(deckIds) ? deckIds : [deckIds]);
    setIsAddDecksModalOpen(true);
  };

  const closeAddDecksModal = () => {
    setIsAddDecksModalOpen(false);
    setAddDecksTargetDeckIds([]);
  };

  const dismissGateToday = () => {
    setIsGateDismissed(true);
    try {
      sessionStorage.setItem('study_plan_gate_dismissed', 'true');
    } catch {}
  };

  const value = {
    activePlan,
    todayQueue,
    todayQueueVersion,
    loading,
    isMutatingDecks,
    isUndoing,
    refreshPlan,
    updateActivePlanDirectly,
    removeDecks,
    undoLastRemove,
    addDecksToPlan,
    updatePlanSettings,
    toastState,
    dismissToast,
    isCreateModalOpen,
    createModalInitialDeckId,
    openCreateModal,
    closeCreateModal,
    isAddDecksModalOpen,
    addDecksTargetDeckIds,
    openAddDecksModal,
    closeAddDecksModal,
    isGateDismissed,
    dismissGateToday,
  };

  return <StudyPlanContext.Provider value={value}>{children}</StudyPlanContext.Provider>;
}

export function useStudyPlan() {
  const context = useContext(StudyPlanContext);
  if (!context) {
    throw new Error('useStudyPlan must be used within a StudyPlanProvider');
  }
  return context;
}
