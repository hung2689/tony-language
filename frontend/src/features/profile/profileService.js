import {
  request,
  API_BASE_URL,
  getAccessToken,
  refreshAccessToken,
  resolveApiAssetUrl,
} from '../../services/api';

export const profileService = {
  /**
   * Fetch current user's profile, level info, and study stats.
   * @returns {Promise<import('./types').ProfileResponse>}
   */
  async getProfile() {
    const res = await request('/profile');
    if (res && typeof res === 'object' && res.avatarUrl) {
      return { ...res, avatarUrl: resolveApiAssetUrl(res.avatarUrl) };
    }
    return res;
  },

  /**
   * Update display name.
   * @param {string} displayName
   * @returns {Promise<{ displayName: string }>}
   */
  async updateName(displayName) {
    const res = await request('/profile', {
      method: 'PATCH',
      body: JSON.stringify({ displayName }),
    });
    if (res && typeof res === 'object' && res.avatarUrl) {
      return { ...res, avatarUrl: resolveApiAssetUrl(res.avatarUrl) };
    }
    return res;
  },

  /**
   * Upload cropped avatar file (JPEG/PNG/WebP, <= 2MB).
   * @param {Blob|File} file
   * @returns {Promise<{ avatarUrl: string }>}
   */
  async uploadAvatar(file, _retry = false) {
    const formData = new FormData();
    formData.append('file', file, 'avatar.png');

    const headers = {};
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/profile/avatar`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });
    } catch {
      throw new Error('Lỗi kết nối khi tải lên ảnh đại diện');
    }

    if (response.status === 401 && !_retry) {
      try {
        await refreshAccessToken();
        return await this.uploadAvatar(file, true);
      } catch {
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const errorMsg =
        payload?.message ||
        payload?.data?.message ||
        'Lỗi tải lên ảnh đại diện';
      throw new Error(errorMsg);
    }

    const data = payload?.data !== undefined ? payload.data : payload || {};
    const rawUrl = data.avatarUrl || '';
    return {
      ...data,
      avatarUrl: rawUrl ? resolveApiAssetUrl(rawUrl, { bustCache: true }) : '',
    };
  },

  /**
   * Remove current user's avatar.
   * @returns {Promise<{ avatarUrl: null }>}
   */
  async deleteAvatar() {
    return await request('/profile/avatar', {
      method: 'DELETE',
    });
  },

  /**
   * Change user password.
   * @param {object} param
   * @param {string} param.currentPassword
   * @param {string} param.newPassword
   * @returns {Promise<object>} AuthResponse with refreshed tokens
   */
  async changePassword({ currentPassword, newPassword }) {
    return await request('/profile/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  /**
   * Get all tiers metadata.
   * @returns {Promise<Array<object>>}
   */
  async getTiers() {
    return await request('/levels/tiers');
  },
};
