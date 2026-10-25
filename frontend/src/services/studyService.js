import { request } from './api';

export const studyService = {
  /**
   * Starts a new study session in the backend.
   *
   * @param {object} params
   * @param {number|string} params.deckId
   * @param {'VI_TO_EN'|'EN_TO_VI'|'RANDOM'} params.direction
   * @param {number} params.plannedCount
   * @param {'random'|'order'} params.order
   * @returns {Promise<{ id: number, deckId: number, ... }>}
   */
  createSession({ deckId, direction = 'VI_TO_EN', plannedCount = 0, order = 'random' }) {
    return request('/study/sessions', {
      method: 'POST',
      body: JSON.stringify({
        deckId,
        direction,
        plannedCount,
        order,
      }),
    });
  },

  /**
   * Records a batch of study answers in the backend.
   *
   * @param {number|string} sessionId
   * @param {Array<object>|object} answers
   * @returns {Promise<{ recordedCount: number, answers: Array }>}
   */
  recordAnswers(sessionId, answers) {
    let payload;
    if (Array.isArray(answers)) {
      payload = { answers };
    } else if (answers && Array.isArray(answers.answers)) {
      payload = answers;
    } else if (answers && typeof answers === 'object') {
      payload = { answers: [answers] };
    } else {
      payload = { answers: [] };
    }
    return request(`/study/sessions/${sessionId}/answers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Finishes a study session in the backend.
   *
   * @param {number|string} sessionId
   * @param {object} summary
   * @param {string} [summary.completedAt]
   * @param {number} summary.totalQuestions
   * @param {number} summary.correctCount
   * @returns {Promise<object>}
   */
  finishSession(sessionId, summary = {}) {
    return request(`/study/sessions/${sessionId}/finish`, {
      method: 'POST',
      body: JSON.stringify(summary),
    });
  },

  /**
   * Fetches session details by ID.
   *
   * @param {number|string} sessionId
   * @returns {Promise<object>}
   */
  getSession(sessionId) {
    return request(`/study/sessions/${sessionId}`);
  },
};
