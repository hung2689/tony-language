import { request, API_BASE_URL, getAccessToken } from '../../services/api';

export const profileService = {
  /**
   * Fetch current user's profile, level info, and study stats.
   * @returns {Promise<import('./types').ProfileResponse>}
   */
  async getProfile() {
    return await request('/profile');
  },

  /**
   * Update display name.
   * @param {string} displayName
   * @returns {Promise<{ displayName: string }>}
   */
  async updateName(displayName) {
    return await request('/profile', {
      method: 'PATCH',
      body: JSON.stringify({ displayName }),
    });
  },

  /**
   * Upload cropped avatar file (JPEG/PNG/WebP, <= 2MB).
   * @param {Blob|File} file
   * @returns {Promise<{ avatarUrl: string }>}
   */
  uploadAvatar(file) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file, 'avatar.png');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/profile/avatar`, true);

      const token = getAccessToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve({ avatarUrl: '' });
          }
        } else {
          let errorMsg = 'Lỗi tải lên ảnh đại diện';
          try {
            const errObj = JSON.parse(xhr.responseText);
            if (errObj.message) errorMsg = errObj.message;
          } catch {
            // ignore
          }
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Lỗi kết nối khi tải lên ảnh đại diện'));
      };

      xhr.send(formData);
    });
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
