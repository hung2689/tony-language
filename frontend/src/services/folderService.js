import { request } from './api';

export const folderService = {
  getFolders() {
    return request('/folders');
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
