import type { DocumentLink, DocumentType } from '../types/models';
import { api } from './api';

export interface DocumentInput {
  name: string;
  url: string;
  description?: string | null;
  type: DocumentType;
  contactId?: string | null;
  dealId?: string | null;
  projectId?: string | null;
  quoteId?: string | null;
}

export const documentsService = {
  list: (filters: { type?: DocumentType; contactId?: string; dealId?: string; projectId?: string } = {}) =>
    api.get<{ items: DocumentLink[] }>('/documents', filters),
  create: (data: DocumentInput) => api.post<DocumentLink>('/documents', data),
  update: (id: string, data: DocumentInput) => api.put<DocumentLink>(`/documents/${id}`, data),
  remove: (id: string) => api.delete<void>(`/documents/${id}`),
};
