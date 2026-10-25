import { describe, it, expect, vi } from 'vitest';
import { createProgressSync, generateClientAnswerId } from '../progressSync';

describe('progressSync', () => {
  it('generateClientAnswerId produces non-empty unique string IDs', () => {
    const id1 = generateClientAnswerId();
    const id2 = generateClientAnswerId();
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('queues answers and flushes automatically when batchSize is reached', async () => {
    let requestBody = null;
    const mockFetch = vi.fn().mockImplementation(async (url, init) => {
      requestBody = JSON.parse(init.body);
      return { ok: true, json: async () => ({ recordedCount: 2 }) };
    });

    const sync = createProgressSync({
      sessionId: 99,
      batchSize: 2,
      fetchImpl: mockFetch,
    });

    sync.enqueueAnswer({ clientAnswerId: 'ans-1', vocabularyId: 10, attemptNo: 1, result: 'CORRECT' });
    expect(sync.getPendingCount()).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();

    // Reaching batch size 2 triggers flush
    sync.enqueueAnswer({ clientAnswerId: 'ans-2', vocabularyId: 20, attemptNo: 1, result: 'WRONG' });

    // Wait for async flush to finish
    await new Promise((r) => setTimeout(r, 10));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(requestBody.answers).toHaveLength(2);
    expect(sync.getPendingCount()).toBe(0);
  });

  it('patches pending entry when override is enqueued before flush', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });

    const sync = createProgressSync({
      sessionId: 99,
      batchSize: 10,
      fetchImpl: mockFetch,
    });

    // Enqueue initial wrong answer
    sync.enqueueAnswer({
      clientAnswerId: 'id-initial',
      vocabularyId: 5,
      attemptNo: 1,
      result: 'WRONG',
      override: false,
    });

    expect(sync.getPendingCount()).toBe(1);
    expect(sync.getPendingQueue()[0].result).toBe('WRONG');

    // Enqueue override before flush
    sync.enqueueAnswer({
      clientAnswerId: 'id-initial',
      vocabularyId: 5,
      attemptNo: 1,
      result: 'CORRECT',
      override: true,
    });

    // Still only 1 pending item, but patched to CORRECT + override: true
    expect(sync.getPendingCount()).toBe(1);
    const patched = sync.getPendingQueue()[0];
    expect(patched.result).toBe('CORRECT');
    expect(patched.override).toBe(true);
  });

  it('failure does not throw and keeps items in pending queue for retry', async () => {
    const onStatusChange = vi.fn();
    const failingFetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    const sync = createProgressSync({
      sessionId: 99,
      batchSize: 10,
      fetchImpl: failingFetch,
      onStatusChange,
    });

    sync.enqueueAnswer({
      clientAnswerId: 'id-fail',
      vocabularyId: 1,
      attemptNo: 1,
      result: 'CORRECT',
    });

    // Manual flush should not throw!
    const result = await sync.flush();
    expect(result.success).toBe(false);
    expect(sync.getPendingCount()).toBe(1);
    expect(onStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ error: true, message: expect.stringContaining('Chưa lưu được tiến độ') })
    );
  });

  it('supports keepalive: true during pagehide/visibilitychange', async () => {
    let sentOptions = null;
    const mockFetch = vi.fn().mockImplementation(async (url, init) => {
      sentOptions = init;
      return { ok: true };
    });

    const sync = createProgressSync({
      sessionId: 101,
      fetchImpl: mockFetch,
    });

    sync.enqueueAnswer({ clientAnswerId: 'keep-1', vocabularyId: 2 });
    await sync.flush({ keepalive: true });

    expect(sentOptions.keepalive).toBe(true);
    expect(sync.getPendingCount()).toBe(0);
  });
});
