import type { Stage, Tag } from '../types/models';
import { api } from './api';

export const tagsService = {
  list: () => api.get<{ items: Tag[] }>('/tags'),
  create: (data: { name: string; color: string }) => api.post<Tag>('/tags', data),
  update: (id: string, data: { name: string; color: string }) => api.put<Tag>(`/tags/${id}`, data),
  remove: (id: string) => api.delete<void>(`/tags/${id}`),
};

export const stagesService = {
  list: () => api.get<{ items: Stage[] }>('/stages'),
  create: (data: { name: string; probability: number; color: string }) =>
    api.post<Stage>('/stages', data),
  update: (id: string, data: { name: string; probability: number; color: string }) =>
    api.put<Stage>(`/stages/${id}`, data),
  reorder: (ids: string[]) => api.post<void>('/stages/reorder', { ids }),
  remove: (id: string) => api.delete<void>(`/stages/${id}`),
};
