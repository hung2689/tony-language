import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  refreshAccessToken,
  setAccessToken,
  getAccessToken,
  clearAccessToken,
  setOnAuthFailure,
} from '../api';

describe('singleFlightRefresh & concurrent rotation protection', () => {
  beforeEach(() => {
    clearAccessToken({ broadcast: false });
    setOnAuthFailure(null);
  });

  it('deduplicates concurrent refresh calls into a single HTTP request (StrictMode & 401-retry safe)', async () => {
    let resolveFetch;
    const mockFetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = () =>
            resolve({
              ok: true,
              status: 200,
              json: async () => ({ accessToken: 'new-jwt-token-1', expiresIn: 900 }),
            });
        })
    );

    // Simulate StrictMode double-effect + concurrent 401 retry calling refreshAccessToken simultaneously
    const p1 = refreshAccessToken(mockFetch);
    const p2 = refreshAccessToken(mockFetch);
    const p3 = refreshAccessToken(mockFetch);

    expect(p1).toBe(p2);
    expect(p2).toBe(p3);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    resolveFetch();
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(r1.accessToken).toBe('new-jwt-token-1');
    expect(r2.accessToken).toBe('new-jwt-token-1');
    expect(r3.accessToken).toBe('new-jwt-token-1');
    expect(getAccessToken()).toBe('new-jwt-token-1');
  });

  it('does not log out if a refresh fails due to concurrent rotation when another refresh succeeded', async () => {
    const onAuthFailure = vi.fn();
    setOnAuthFailure(onAuthFailure);

    const mockFetch = vi.fn().mockImplementation(async () => {
      // Simulate another tab/call succeeding and updating in-memory token while this fetch was in flight
      setAccessToken('token-from-winning-tab', { broadcast: false });
      return {
        ok: false,
        status: 401,
        json: async () => ({
          errorCode: 'INVALID_REFRESH_TOKEN',
          message: 'Phiên đăng nhập vừa được làm mới ở một tab khác. Vui lòng làm mới trang.',
        }),
      };
    });

    const result = await refreshAccessToken(mockFetch);

    expect(result.accessToken).toBe('token-from-winning-tab');
    expect(getAccessToken()).toBe('token-from-winning-tab');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('retries once and succeeds when server responds with grace-window concurrent rotation 401', async () => {
    const onAuthFailure = vi.fn();
    setOnAuthFailure(onAuthFailure);

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          errorCode: 'INVALID_REFRESH_TOKEN',
          message: 'Phiên đăng nhập vừa được làm mới ở một tab khác. Vui lòng làm mới trang.',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accessToken: 'recovered-jwt-token', expiresIn: 900 }),
      });

    const result = await refreshAccessToken(mockFetch);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.accessToken).toBe('recovered-jwt-token');
    expect(getAccessToken()).toBe('recovered-jwt-token');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });
});
