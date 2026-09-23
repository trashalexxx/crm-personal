import type { User } from '../types/models';
import { api } from './api';

export interface Credentials {
  email: string;
  password: string;
}

export const authService = {
  me: () => api.get<User>('/auth/me'),
  login: (data: Credentials) => api.post<User>('/auth/login', data),
  register: (data: Credentials & { name: string }) => api.post<User>('/auth/register', data),
  logout: () => api.post<void>('/auth/logout'),
  updateProfile: (data: Pick<User, 'name' | 'currency' | 'locale' | 'theme'>) =>
    api.patch<User>('/auth/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post<void>('/auth/change-password', data),
};
