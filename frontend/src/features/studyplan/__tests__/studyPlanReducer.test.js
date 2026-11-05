import { describe, it, expect } from 'vitest';
import {
  initialStudyPlanState,
  studyPlanReducer,
  pickNewerPlan,
  selectDisplayPlan,
} from '../studyPlanReducer';

describe('studyPlanReducer & Derived State Unit Tests', () => {
  const basePlan = {
    id: 100,
    name: 'Lộ trình TOEIC',
    revision: 5,
    totalWords: 120,
    masteredWords: 30,
    learningWords: 40,
    decks: [
      { id: 1, name: 'Deck 1', cardCount: 40, masteredCount: 10, sortOrder: 0 },
      { id: 2, name: 'Deck 2', cardCount: 50, masteredCount: 15, sortOrder: 1 },
      { id: 3, name: 'Deck 3', cardCount: 30, masteredCount: 5, sortOrder: 2 },
    ],
  };

  it('SET_SERVER_PLAN sets initial plan and respects monotonic revision guard', () => {
    let state = studyPlanReducer(initialStudyPlanState, {
      type: 'SET_SERVER_PLAN',
      plan: basePlan,
    });
    expect(state.serverPlan.revision).toBe(5);

    // Older revision (revision: 4) should be ignored
    const stalePlan = { ...basePlan, revision: 4, totalWords: 999 };
    state = studyPlanReducer(state, {
      type: 'SET_SERVER_PLAN',
      plan: stalePlan,
    });
    expect(state.serverPlan.revision).toBe(5);
    expect(state.serverPlan.totalWords).toBe(120);

    // Newer revision (revision: 6) should be applied
    const newerPlan = { ...basePlan, revision: 6, totalWords: 90 };
    state = studyPlanReducer(state, {
      type: 'SET_SERVER_PLAN',
      plan: newerPlan,
    });
    expect(state.serverPlan.revision).toBe(6);
    expect(state.serverPlan.totalWords).toBe(90);
  });

  it('OP_ADD immediately hides removed decks in selectDisplayPlan while preserving order and server aggregate numbers', () => {
    let state = studyPlanReducer(initialStudyPlanState, {
      type: 'SET_SERVER_PLAN',
      plan: basePlan,
    });

    state = studyPlanReducer(state, {
      type: 'OP_ADD',
      opId: 'op-1',
      ids: [2],
    });

    const displayPlan = selectDisplayPlan(state);
    expect(displayPlan.decks.map((d) => d.id)).toEqual([1, 3]);
    // Aggregate numbers remain untouched until server responds (no false client subtraction)
    expect(displayPlan.totalWords).toBe(120);
    expect(displayPlan.masteredWords).toBe(30);
  });

  it('Sequential operations: OP_DONE updates serverPlan and removes only completed opId', () => {
    let state = studyPlanReducer(initialStudyPlanState, {
      type: 'SET_SERVER_PLAN',
      plan: basePlan,
    });

    // Op 1 removes Deck 1, Op 2 removes Deck 3
    state = studyPlanReducer(state, { type: 'OP_ADD', opId: 'op-1', ids: [1] });
    state = studyPlanReducer(state, { type: 'OP_ADD', opId: 'op-2', ids: [3] });

    expect(selectDisplayPlan(state).decks.map((d) => d.id)).toEqual([2]);

    // Op 1 completes on server (revision 6, decks [2, 3])
    const serverAfterOp1 = {
      ...basePlan,
      revision: 6,
      totalWords: 85,
      decks: [
        { id: 2, name: 'Deck 2', cardCount: 50, masteredCount: 15, sortOrder: 1 },
        { id: 3, name: 'Deck 3', cardCount: 30, masteredCount: 5, sortOrder: 2 },
      ],
    };
    state = studyPlanReducer(state, {
      type: 'OP_DONE',
      opId: 'op-1',
      plan: serverAfterOp1,
    });

    // Deck 3 is still hidden by pending op-2! No resurrection flicker.
    const displayAfterOp1 = selectDisplayPlan(state);
    expect(displayAfterOp1.decks.map((d) => d.id)).toEqual([2]);
    expect(displayAfterOp1.totalWords).toBe(85);

    // Suppose Op 2 fails -> OP_REMOVE_PENDING restores Deck 3 in original order
    state = studyPlanReducer(state, {
      type: 'OP_REMOVE_PENDING',
      opId: 'op-2',
    });

    const displayAfterOp2Fail = selectDisplayPlan(state);
    expect(displayAfterOp2Fail.decks.map((d) => d.id)).toEqual([2, 3]);
    expect(state.pendingOps).toHaveLength(0);
  });

  it('pickNewerPlan handles plan replacement (different id) and null clearing', () => {
    expect(pickNewerPlan(basePlan, null)).toBeNull();
    const differentPlan = { id: 200, revision: 1, decks: [] };
    expect(pickNewerPlan(basePlan, differentPlan)).toEqual(differentPlan);
  });
});
