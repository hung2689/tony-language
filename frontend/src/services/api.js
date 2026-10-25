function resolveApiBaseUrl() {
  const envUrl = import.meta.env?.VITE_API_BASE_URL;
  if (!envUrl) return '/api';
  let trimmed = envUrl.trim().replace(/\/+$/, '');
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
    trimmed = `https://${trimmed}`;
  }
  if (!trimmed.endsWith('/api') && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
    trimmed = `${trimmed}/api`;
  }
  return trimmed;
}

export const API_BASE_URL = resolveApiBaseUrl();
const AUTH_LOCK_NAME = 'language_learning_auth_refresh';
const AUTH_CHANNEL_NAME = 'language_learning_auth_channel';

let inMemoryAccessToken = null;
let lastTokenUpdatedAt = 0;
let refreshPromise = null;
let onAuthFailureCallback = null;
let authChannel = null;

function getAuthChannel() {
  if (authChannel) return authChannel;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      authChannel.onmessage = (event) => {
        const msg = event?.data;
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'TOKEN_REFRESHED' && msg.accessToken) {
          inMemoryAccessToken = msg.accessToken;
          lastTokenUpdatedAt = msg.timestamp || Date.now();
        } else if (msg.type === 'LOGOUT') {
          inMemoryAccessToken = null;
          lastTokenUpdatedAt = 0;
          if (onAuthFailureCallback) {
            onAuthFailureCallback();
          }
        }
      };
    } catch {
      authChannel = null;
    }
  }
  return authChannel;
}

// Initialize BroadcastChannel listener if supported
getAuthChannel();

export function setAccessToken(token, { broadcast = true } = {}) {
  inMemoryAccessToken = token;
  lastTokenUpdatedAt = token ? Date.now() : 0;
  if (broadcast && token) {
    try {
      getAuthChannel()?.postMessage({
        type: 'TOKEN_REFRESHED',
        accessToken: token,
        timestamp: lastTokenUpdatedAt,
      });
    } catch {
      // Ignore BroadcastChannel errors
    }
  }
}

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function clearAccessToken({ broadcast = false } = {}) {
  inMemoryAccessToken = null;
  lastTokenUpdatedAt = 0;
  if (broadcast) {
    try {
      getAuthChannel()?.postMessage({ type: 'LOGOUT' });
    } catch {
      // Ignore BroadcastChannel errors
    }
  }
}

export function setOnAuthFailure(callback) {
  onAuthFailureCallback = callback;
}

/**
 * Serializes an async operation across browser tabs using the Web Locks API
 * when available, falling back to direct execution in environments without it.
 */
export function withCrossTabLock(lockName, fn) {
  if (typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function') {
    return navigator.locks.request(lockName, fn);
  }
  return fn();
}

async function fetchRefreshEndpoint(fetchImpl = fetch) {
  const res = await fetchImpl(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    credentials: 'include',
  });
  const payload = await res.json().catch(() => null);
  return { res, payload };
}

function isConcurrentRotationError(payload) {
  if (!payload) return false;
  if (payload.errorCode === 'CONCURRENT_REFRESH') return true;
  const msg = String(payload.message || '').toLowerCase();
  return msg.includes('tab khác') || msg.includes('concurrent');
}

async function performSerializedRefresh(fetchImpl = fetch) {
  const requestStartedAt = Date.now();
  const tokenBeforeRefresh = inMemoryAccessToken;

  return withCrossTabLock(AUTH_LOCK_NAME, async () => {
    // If another tab already refreshed and broadcast a new token while we waited for the lock,
    // reuse that token in memory instead of rotating the cookie again.
    if (
      inMemoryAccessToken &&
      lastTokenUpdatedAt >= requestStartedAt &&
      inMemoryAccessToken !== tokenBeforeRefresh
    ) {
      return { accessToken: inMemoryAccessToken };
    }

    try {
      let { res, payload } = await fetchRefreshEndpoint(fetchImpl);

      if (!res.ok) {
        // 1. Check if another concurrent refresh already updated the in-memory token
        if (
          inMemoryAccessToken &&
          inMemoryAccessToken !== tokenBeforeRefresh &&
          lastTokenUpdatedAt >= requestStartedAt
        ) {
          return { accessToken: inMemoryAccessToken };
        }

        // 2. If failed due to concurrent rotation in another tab, wait briefly for cookie/broadcast and retry once
        if (res.status === 401 && isConcurrentRotationError(payload)) {
          await new Promise((resolve) => setTimeout(resolve, 120));
          if (
            inMemoryAccessToken &&
            inMemoryAccessToken !== tokenBeforeRefresh &&
            lastTokenUpdatedAt >= requestStartedAt
          ) {
            return { accessToken: inMemoryAccessToken };
          }
          const retryResult = await fetchRefreshEndpoint(fetchImpl);
          res = retryResult.res;
          payload = retryResult.payload;
        }
      }

      if (!res.ok) {
        throw new Error(payload?.message || 'Phiên làm việc đã hết hạn');
      }

      const data = payload?.data !== undefined ? payload.data : payload;
      const newAccessToken = data?.accessToken;
      if (!newAccessToken) {
        throw new Error('Phản hồi làm mới phiên không hợp lệ');
      }

      setAccessToken(newAccessToken, { broadcast: true });
      return data;
    } catch (err) {
      // Never log out if another concurrent refresh succeeded in the meantime
      if (
        inMemoryAccessToken &&
        inMemoryAccessToken !== tokenBeforeRefresh &&
        lastTokenUpdatedAt >= requestStartedAt
      ) {
        return { accessToken: inMemoryAccessToken };
      }

      clearAccessToken({ broadcast: false });
      if (onAuthFailureCallback) {
        onAuthFailureCallback();
      }
      throw err;
    }
  });
}

/**
 * Single-flight silent refresh shared between app startup (StrictMode-safe)
 * and the 401 automatic retry path.
 */
export function refreshAccessToken(fetchImpl = fetch) {
  if (!refreshPromise) {
    refreshPromise = performSerializedRefresh(fetchImpl).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ...options.headers,
  };

  if (inMemoryAccessToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${inMemoryAccessToken}`;
  }

  // Ensure CSRF header for refresh & logout endpoints
  if (endpoint.startsWith('/auth/refresh') || endpoint.startsWith('/auth/logout')) {
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (response.status === 401) {
      const isAuthEndpoint =
        endpoint.startsWith('/auth/login') ||
        endpoint.startsWith('/auth/register') ||
        endpoint.startsWith('/auth/refresh');

      if (!isAuthEndpoint && !options._retry) {
        try {
          const refreshData = await refreshAccessToken();
          const newToken = refreshData?.accessToken || inMemoryAccessToken;
          return await request(endpoint, {
            ...options,
            _retry: true,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${newToken}`,
            },
          });
        } catch {
          const errorMessage = data?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
          throw new Error(errorMessage);
        }
      }
    }

    if (!response.ok) {
      let errorMessage = 'Lỗi máy chủ';
      if (data?.message) {
        errorMessage = data.message;
      } else if (data?.details && typeof data.details === 'object') {
        errorMessage = Object.values(data.details).join(', ');
      } else {
        errorMessage = `Lỗi máy chủ (${response.status})`;
      }
      throw new Error(errorMessage);
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend.');
    }
    throw err;
  }
}
