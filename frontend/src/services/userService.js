import { request } from './api';

export const userService = {
  getMe: () => request('/users/me'),
};
