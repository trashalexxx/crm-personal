import type { Deal, DealStatus } from '../types/models';
import { api } from './api';

export interface DealInput {
  title: string;
  description?: string | null;
  contactId?: string | null;
  stageId: string;
  amountCents: number;
  currency: string;
  expectedCloseDate?: string | null;
}

export const dealsService = {
  list: (filters: { status?: DealStatus; contactId?: string; search?: string } = {}) =>
    api.get<{ items: Deal[] }>('/deals', filters),
  get: (id: string) => api.get<Deal>(`/deals/${id}`),
  create: (data: DealInput) => api.post<Deal>('/deals', data),
  update: (id: string, data: DealInput) => api.put<Deal>(`/deals/${id}`, data),
  move: (id: string, stageId: string, position: number) =>
    api.patch<Deal>(`/deals/${id}/move`, { stageId, position }),
  close: (id: string, status: DealStatus, lostReason?: string | null) =>
    api.patch<Deal>(`/deals/${id}/close`, { status, lostReason }),
  remove: (id: string) => api.delete<void>(`/deals/${id}`),
};
