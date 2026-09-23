import type { Task, TaskPriority, TaskStatus } from '../types/models';
import { api } from './api';

export interface TaskInput {
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  projectId?: string | null;
}

export type TaskFilters = {
  status?: TaskStatus;
  priority?: TaskPriority;
  contactId?: string;
  dealId?: string;
  projectId?: string;
  scope?: 'all' | 'open' | 'overdue' | 'today' | 'week';
};

export const tasksService = {
  list: (filters: TaskFilters = {}) => api.get<{ items: Task[] }>('/tasks', filters),
  create: (data: TaskInput) => api.post<Task>('/tasks', data),
  update: (id: string, data: TaskInput) => api.put<Task>(`/tasks/${id}`, data),
  toggle: (id: string) => api.patch<Task>(`/tasks/${id}/toggle`),
  remove: (id: string) => api.delete<void>(`/tasks/${id}`),
};
