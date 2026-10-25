import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { studyPlanService } from '../../services/studyPlanService';
import { useAuth } from '../auth/AuthContext';

const StudyPlanContext = createContext(null);

/**
 * Checks whether a study plan is currently in ACTIVE status.
 * Reusable helper across study plan features (BUG-15).
 */
export const isPlanActive = (plan) => Boolean(plan && plan.status === 'ACTIVE');

export function StudyPlanProvider({ children }) {
  const { user } = useAuth();
  const [activePlan, setActivePlan] = useState(null);
  const [todayQueue, setTodayQueue] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const refreshPlan = useCallback(async () => {
    if (!user) {
      setActivePlan(null);
      setTodayQueue(null);
      return;
    }
    setLoading(true);
    try {
      const plan = await studyPlanService.getCurrentPlan();
      setActivePlan(plan);
      if (isPlanActive(plan)) {
        const queueRes = await studyPlanService.getTodayQueue();
        setTodayQueue(queueRes || null);
      } else {
        setTodayQueue(null);
      }
    } catch {
      setActivePlan(null);
      setTodayQueue(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshPlan();
  }, [refreshPlan]);

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
    loading,
    refreshPlan,
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

  return (
    <StudyPlanContext.Provider value={value}>
      {children}
    </StudyPlanContext.Provider>
  );
}

export function useStudyPlan() {
  const context = useContext(StudyPlanContext);
  if (!context) {
    throw new Error('useStudyPlan must be used within a StudyPlanProvider');
  }
  return context;
}
