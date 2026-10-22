const API_BASE_URL = '/api';

let inMemoryAccessToken = null;
let refreshPromise = null;
let onAuthFailureCallback = null;

export function setAccessToken(token) {
  inMemoryAccessToken = token;
}

export function getAccessToken() {
  return inMemoryAccessToken;
}

export function clearAccessToken() {
  inMemoryAccessToken = null;
}

export function setOnAuthFailure(callback) {
  onAuthFailureCallback = callback;
}

async function performRefresh() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.message || 'Phiên làm việc đã hết hạn');
    }

    const data = await res.json();
    const newAccessToken = data.accessToken;
    setAccessToken(newAccessToken);
    return newAccessToken;
  } catch (err) {
    clearAccessToken();
    if (onAuthFailureCallback) {
      onAuthFailureCallback();
    }
    throw err;
  }
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
        if (!refreshPromise) {
          refreshPromise = performRefresh().finally(() => {
            refreshPromise = null;
          });
        }

        try {
          const newToken = await refreshPromise;
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
