import type { Contact, ContactDetail, ContactStatus, DuplicateGroup } from '../types/models';
import { api } from './api';

export interface ContactInput {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  position?: string | null;
  website?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  status: ContactStatus;
  source?: string | null;
  notes?: string | null;
  tagIds?: string[];
}

export type ContactFilters = {
  search?: string;
  status?: ContactStatus;
  tagId?: string;
  sort?: 'recent' | 'name' | 'company';
};

export const contactsService = {
  list: (filters: ContactFilters = {}) =>
    api.get<{ items: Contact[]; total: number }>('/contacts', filters),
  get: (id: string) => api.get<ContactDetail>(`/contacts/${id}`),
  create: (data: ContactInput) => api.post<Contact>('/contacts', data),
  update: (id: string, data: ContactInput) => api.put<Contact>(`/contacts/${id}`, data),
  remove: (id: string) => api.delete<void>(`/contacts/${id}`),
  duplicates: () => api.get<{ groups: DuplicateGroup[] }>('/contacts/duplicates'),
};
