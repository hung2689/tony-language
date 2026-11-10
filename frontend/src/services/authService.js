import {
  request,
  setAccessToken,
  clearAccessToken,
  refreshAccessToken,
  resolveApiAssetUrl,
} from './api';

let restoreSessionPromise = null;

function normalizeUserAvatar(user) {
  if (!user || typeof user !== 'object') return user;
  if (user.avatarUrl) {
    return { ...user, avatarUrl: resolveApiAssetUrl(user.avatarUrl) };
  }
  return user;
}

export const authService = {
  async register(email, username, password) {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
    if (data?.accessToken) {
      setAccessToken(data.accessToken);
    }
    if (data?.user) {
      data.user = normalizeUserAvatar(data.user);
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
    if (data?.user) {
      data.user = normalizeUserAvatar(data.user);
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
        const me = await request('/users/me');
        return normalizeUserAvatar(me);
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
    const me = await request('/users/me');
    return normalizeUserAvatar(me);
  },
};
