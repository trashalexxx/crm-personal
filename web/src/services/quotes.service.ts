import type { Quote, QuoteItem, QuoteStatus } from '../types/models';
import { api } from './api';

export interface QuoteInput {
  number: string;
  title: string;
  notes?: string | null;
  status: QuoteStatus;
  currency: string;
  taxPercent: number;
  contactId?: string | null;
  dealId?: string | null;
  issueDate?: string | null;
  validUntil?: string | null;
  items: QuoteItem[];
}

export const quotesService = {
  list: (filters: { status?: QuoteStatus; contactId?: string } = {}) =>
    api.get<{ items: Quote[] }>('/quotes', filters),
  get: (id: string) => api.get<Quote>(`/quotes/${id}`),
  nextNumber: () => api.get<{ number: string }>('/quotes/next-number'),
  create: (data: QuoteInput) => api.post<Quote>('/quotes', data),
  update: (id: string, data: QuoteInput) => api.put<Quote>(`/quotes/${id}`, data),
  setStatus: (id: string, status: QuoteStatus) => api.patch<Quote>(`/quotes/${id}/status`, { status }),
  remove: (id: string) => api.delete<void>(`/quotes/${id}`),
};
