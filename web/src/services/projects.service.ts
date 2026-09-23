import type { Project, ProjectStatus } from '../types/models';
import { api } from './api';

export interface ProjectInput {
  name: string;
  description?: string | null;
  status: ProjectStatus;
  progress: number;
  contactId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
}

export const projectsService = {
  list: (filters: { status?: ProjectStatus } = {}) => api.get<{ items: Project[] }>('/projects', filters),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: ProjectInput) => api.post<Project>('/projects', data),
  update: (id: string, data: ProjectInput) => api.put<Project>(`/projects/${id}`, data),
  remove: (id: string) => api.delete<void>(`/projects/${id}`),
};
