import type { CalendarEvent, EventType } from '../types/models';
import { api } from './api';

export interface EventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  type: EventType;
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  contactId?: string | null;
}

export const eventsService = {
  list: (filters: { from?: string; to?: string; contactId?: string } = {}) =>
    api.get<{ items: CalendarEvent[] }>('/events', filters),
  create: (data: EventInput) => api.post<CalendarEvent>('/events', data),
  update: (id: string, data: EventInput) => api.put<CalendarEvent>(`/events/${id}`, data),
  remove: (id: string) => api.delete<void>(`/events/${id}`),
};
