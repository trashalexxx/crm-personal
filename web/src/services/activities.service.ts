import type { Activity, ActivityType } from '../types/models';
import { api } from './api';

export interface ActivityInput {
  type: ActivityType;
  subject: string;
  content?: string | null;
  occurredAt?: string | null;
  durationMin?: number | null;
  contactId?: string | null;
  dealId?: string | null;
  projectId?: string | null;
}

export const activitiesService = {
  list: (filters: { type?: ActivityType; contactId?: string; dealId?: string; take?: number } = {}) =>
    api.get<{ items: Activity[] }>('/activities', filters),
  create: (data: ActivityInput) => api.post<Activity>('/activities', data),
  update: (id: string, data: ActivityInput) => api.put<Activity>(`/activities/${id}`, data),
  remove: (id: string) => api.delete<void>(`/activities/${id}`),
};
