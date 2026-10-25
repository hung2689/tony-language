import { API_BASE_URL } from '@/services/api';

/**
 * Generates an RFC4122 v4 UUID for idempotent answer recording.
 *
 * @returns {string}
 */
export function generateClientAnswerId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates an answer synchronization manager with batching, retries, and keepalive support.
 *
 * @param {object} config
 * @param {number|string} [config.sessionId]
 * @param {() => string|null} [config.getAccessToken]
 * @param {typeof fetch} [config.fetchImpl=window.fetch]
 * @param {(status: { error: boolean, message?: string }) => void} [config.onStatusChange]
 * @param {number} [config.batchSize=10]
 * @param {number} [config.maxRetries=3]
 */
export function createProgressSync({
  sessionId = null,
  getAccessToken = () => null,
  fetchImpl = (typeof window !== 'undefined' ? window.fetch : null),
  onStatusChange = () => {},
  batchSize = 10,
  maxRetries = 3,
} = {}) {
  let currentSessionId = sessionId;
  let pendingQueue = [];
  let isFlushing = false;
  let retryCount = 0;

  function setSessionId(id) {
    currentSessionId = id;
  }

  function getPendingCount() {
    return pendingQueue.length;
  }

  function getPendingQueue() {
    return [...pendingQueue];
  }

  /**
   * Enqueues an answer.
   * If the answer is an override, it patches the existing pending item if not yet flushed,
   * or enqueues a correction item if it was already sent.
   *
   * @param {object} answer
   */
  function enqueueAnswer(answer) {
    if (!answer) return;

    if (answer.override) {
      const pendingIdx = pendingQueue.findIndex(
        (item) => item.vocabularyId === answer.vocabularyId && item.attemptNo === answer.attemptNo
      );

      if (pendingIdx !== -1) {
        // Patch the pending answer before it's sent
        pendingQueue[pendingIdx] = {
          ...pendingQueue[pendingIdx],
          ...answer,
          override: true,
          result: 'CORRECT',
        };
      } else {
        // Already sent to server, enqueue as an override correction
        pendingQueue.push({ ...answer });
      }
    } else {
      pendingQueue.push({ ...answer });
    }

    if (pendingQueue.length >= batchSize) {
      flush();
    }
  }

  /**
   * Flushes queued answers to the backend.
   * Best-effort: failures never throw to avoid disrupting the study session.
   *
   * @param {{ keepalive?: boolean }} [options]
   * @returns {Promise<{ success: boolean, recordedCount: number }>}
   */
  async function flush({ keepalive = false } = {}) {
    if (!currentSessionId || pendingQueue.length === 0 || !fetchImpl) {
      return { success: true, recordedCount: 0 };
    }

    if (isFlushing && !keepalive) {
      return { success: false, recordedCount: 0 };
    }

    isFlushing = true;
    const batchToSend = [...pendingQueue];
    const token = getAccessToken();

    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetchImpl(`${API_BASE_URL}/study/sessions/${currentSessionId}/answers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ answers: batchToSend }),
        keepalive: Boolean(keepalive),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Successfully recorded, remove the sent batch from pending
      const sentIds = new Set(batchToSend.map((item) => item.clientAnswerId));
      pendingQueue = pendingQueue.filter((item) => !sentIds.has(item.clientAnswerId));
      retryCount = 0;
      onStatusChange({ error: false });

      return { success: true, recordedCount: batchToSend.length };
    } catch {
      retryCount += 1;
      onStatusChange({
        error: true,
        message: 'Chưa lưu được tiến độ, sẽ thử lại.',
      });

      // Exponential backoff retry if under maxRetries and not in keepalive flush
      if (!keepalive && retryCount <= maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 8000);
        setTimeout(() => {
          flush();
        }, delay);
      }

      return { success: false, recordedCount: 0 };
    } finally {
      isFlushing = false;
    }
  }

  return {
    setSessionId,
    getPendingCount,
    getPendingQueue,
    enqueueAnswer,
    flush,
  };
}
