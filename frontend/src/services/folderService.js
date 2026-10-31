import { request } from './api';

// In-memory client cache for folders
let cachedFolders = null;

export const folderService = {
  async getFolders({ skipCache = false } = {}) {
    if (!skipCache && cachedFolders) {
      return cachedFolders;
    }
    const data = await request('/folders');
    cachedFolders = data;
    return data;
  },

  getCachedFolders() {
    return cachedFolders;
  },

  setCachedFolders(data) {
    cachedFolders = data;
  },

  clearCache() {
    cachedFolders = null;
  },

  getFolder(id) {
    return request(`/folders/${id}`);
  },

  createFolder(name) {
    return request('/folders', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  renameFolder(id, name) {
    return request(`/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },

  deleteFolder(id, mode = 'setNull') {
    return request(`/folders/${id}?mode=${mode}`, {
      method: 'DELETE',
    });
  },
};
