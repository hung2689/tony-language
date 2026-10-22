import { request, setAccessToken, clearAccessToken } from './api';

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

  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data?.accessToken) {
      setAccessToken(data.accessToken);
    }
    return data;
  },

  async refresh() {
    const data = await request('/auth/refresh', {
      method: 'POST',
    });
    if (data?.accessToken) {
      setAccessToken(data.accessToken);
    }
    return data;
  },

  async logout() {
    try {
      await request('/auth/logout', {
        method: 'POST',
      });
    } finally {
      clearAccessToken();
    }
  },

  async getMe() {
    return await request('/users/me');
  },
};
