import { request, getAccessToken, API_BASE_URL } from './api';

/**
 * Fetch all wallpapers for the current user.
 * @returns {Promise<Array>}
 */
export async function getWallpapers() {
  return request('/wallpapers');
}

/**
 * Upload a new wallpaper image.
 * @param {File} file - The image file to upload.
 * @param {string} [name] - Optional custom display name.
 * @param {function} [onProgress] - Optional callback(percent) for upload progress.
 * @returns {Promise<Object>} - The created WallpaperResponse.
 */
export function uploadWallpaper(file, name = '', onProgress = null) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name && name.trim()) {
      formData.append('name', name.trim());
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/wallpapers`, true);

    const token = getAccessToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status === 201) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve(null);
        }
      } else {
        let message = `Lỗi tải lên (${xhr.status})`;
        try {
          const err = JSON.parse(xhr.responseText);
          message = err.message || message;
        } catch {}
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error('Không thể kết nối đến máy chủ'));
    xhr.ontimeout = () => reject(new Error('Quá thời gian tải lên'));
    xhr.timeout = 60000;

    xhr.send(formData);
  });
}

/**
 * Delete a wallpaper by ID.
 * @param {number|string} id
 * @returns {Promise<void>}
 */
export async function deleteWallpaper(id) {
  return request(`/wallpapers/${id}`, { method: 'DELETE' });
}

/**
 * Set a wallpaper as active for the current user.
 * @param {number|string} id
 * @returns {Promise<void>}
 */
export async function setActiveWallpaper(id) {
  return request(`/wallpapers/${id}/active`, { method: 'PATCH' });
}
