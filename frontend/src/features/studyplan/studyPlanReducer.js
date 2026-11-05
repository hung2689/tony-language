/**
 * Pure reducer and selector for StudyPlan optimistic state management.
 * State shape:
 * {
 *   serverPlan: StudyPlanResponse | null,
 *   pendingOps: Array<{ opId: string, ids: number[] }>
 * }
 */

export const initialStudyPlanState = {
  serverPlan: null,
  pendingOps: [],
};

/**
 * Compares revision numbers monotonically so a stale background refresh
 * never overwrites a newer mutation response.
 */
export function pickNewerPlan(currentPlan, incomingPlan) {
  if (incomingPlan === null) return null;
  if (!incomingPlan) return currentPlan;
  if (!currentPlan) return incomingPlan;
  if (currentPlan.id !== incomingPlan.id) return incomingPlan;

  const currentRev = typeof currentPlan.revision === 'number' ? currentPlan.revision : null;
  const incomingRev = typeof incomingPlan.revision === 'number' ? incomingPlan.revision : null;

  if (currentRev !== null && incomingRev !== null && incomingRev < currentRev) {
    return currentPlan;
  }

  return incomingPlan;
}

export function studyPlanReducer(state = initialStudyPlanState, action) {
  switch (action.type) {
    case 'RESET_PLAN':
      return {
        serverPlan: null,
        pendingOps: [],
      };

    case 'SET_SERVER_PLAN':
      return {
        ...state,
        serverPlan: pickNewerPlan(state.serverPlan, action.plan),
      };

    case 'OP_ADD': {
      const uniqueIds = Array.from(new Set(action.ids || []));
      if (uniqueIds.length === 0) return state;
      return {
        ...state,
        pendingOps: [...state.pendingOps, { opId: action.opId, ids: uniqueIds }],
      };
    }

    case 'OP_DONE':
      return {
        serverPlan: pickNewerPlan(state.serverPlan, action.plan),
        pendingOps: state.pendingOps.filter((op) => op.opId !== action.opId),
      };

    case 'OP_REMOVE_PENDING':
      return {
        ...state,
        pendingOps: state.pendingOps.filter((op) => op.opId !== action.opId),
      };

    default:
      return state;
  }
}

/**
 * Derives the display plan by hiding any deck IDs currently in pendingOps.
 * Aggregate stats remain from serverPlan (no double-jumping estimate).
 */
export function selectDisplayPlan(state) {
  if (!state?.serverPlan) return null;
  if (!state.pendingOps || state.pendingOps.length === 0) {
    return state.serverPlan;
  }

  const hiddenIds = new Set(state.pendingOps.flatMap((op) => op.ids));
  return {
    ...state.serverPlan,
    decks: (state.serverPlan.decks || []).filter((deck) => !hiddenIds.has(deck.id)),
  };
}
