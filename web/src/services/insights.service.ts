import type { DashboardSummary, ImportResult, ReportsData } from '../types/models';
import { api } from './api';

export const dashboardService = {
  summary: () => api.get<DashboardSummary>('/dashboard'),
};

export const reportsService = {
  get: (months: number) => api.get<ReportsData>('/reports', { months }),
};

export const dataService = {
  exportContacts: () => api.download('/data/contacts/export.csv', 'contactos.csv'),
  downloadTemplate: () => api.download('/data/contacts/template.csv', 'plantilla-contactos.csv'),
  downloadBackup: () => api.download('/data/backup.json', 'crm-backup.json'),
  importContacts: (csv: string, duplicates: 'skip' | 'update' | 'create', dryRun: boolean) =>
    api.post<ImportResult>('/data/contacts/import', { csv, duplicates, dryRun }),
};
