import { request, setAccessToken, clearAccessToken, refreshAccessToken } from './api';

let restoreSessionPromise = null;

export const authService = {
  async register(email, username, password) {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
    if (data?.accessToken) {
      setAccessToken(data.accessToken);
    }
    return data;
  },

  async login(email, password, rememberMe = false) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe: Boolean(rememberMe) }),
    });
    if (data?.accessToken) {
      setAccessToken(data.accessToken);
    }
    return data;
  },

  async refresh() {
    return await refreshAccessToken();
  },

  async restoreSession() {
    if (!restoreSessionPromise) {
      restoreSessionPromise = (async () => {
        await refreshAccessToken();
        return await request('/users/me');
      })().finally(() => {
        restoreSessionPromise = null;
      });
    }
    return restoreSessionPromise;
  },

  async logout() {
    try {
      await request('/auth/logout', {
        method: 'POST',
      });
    } finally {
      clearAccessToken({ broadcast: true });
    }
  },

  async getMe() {
    return await request('/users/me');
  },
};
