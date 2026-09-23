import type {
  ActivityType,
  ContactStatus,
  DealStatus,
  DocumentType,
  EventType,
  ProjectStatus,
  QuoteStatus,
  TaskPriority,
  TaskStatus,
} from '../types/models';

/** Etiquetas en español y clases de color para cada valor de enumeración. */

export const CONTACT_STATUS: Record<ContactStatus, { label: string; className: string }> = {
  LEAD: {
    label: 'Potencial',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
  ACTIVE: {
    label: 'Activo',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  RECURRING: {
    label: 'Recurrente',
    className: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  },
  INACTIVE: {
    label: 'Inactivo',
    className: 'bg-slate-200 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
  },
};

export const DEAL_STATUS: Record<DealStatus, { label: string; className: string }> = {
  OPEN: {
    label: 'Abierta',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
  WON: {
    label: 'Ganada',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  LOST: {
    label: 'Perdida',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  },
};

export const TASK_PRIORITY: Record<TaskPriority, { label: string; className: string; dot: string }> = {
  LOW: {
    label: 'Baja',
    className: 'bg-slate-200 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
  MEDIUM: {
    label: 'Media',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
  HIGH: {
    label: 'Alta',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  URGENT: {
    label: 'Urgente',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
};

export const TASK_STATUS: Record<TaskStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pendiente',
    className: 'bg-slate-200 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
  },
  IN_PROGRESS: {
    label: 'En curso',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
  DONE: {
    label: 'Completada',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  CANCELLED: {
    label: 'Cancelada',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  },
};

export const ACTIVITY_TYPE: Record<ActivityType, { label: string; icon: string; className: string }> = {
  NOTE: { label: 'Nota', icon: '📝', className: 'bg-slate-100 dark:bg-slate-800' },
  CALL: { label: 'Llamada', icon: '📞', className: 'bg-sky-100 dark:bg-sky-500/15' },
  MEETING: { label: 'Reunión', icon: '🤝', className: 'bg-violet-100 dark:bg-violet-500/15' },
  EMAIL: { label: 'Correo', icon: '✉️', className: 'bg-amber-100 dark:bg-amber-500/15' },
  WHATSAPP: { label: 'WhatsApp', icon: '💬', className: 'bg-emerald-100 dark:bg-emerald-500/15' },
  OTHER: { label: 'Otro', icon: '•', className: 'bg-slate-100 dark:bg-slate-800' },
};

export const EVENT_TYPE: Record<EventType, { label: string; className: string }> = {
  MEETING: { label: 'Reunión', className: 'bg-violet-500' },
  CALL: { label: 'Llamada', className: 'bg-sky-500' },
  FOLLOW_UP: { label: 'Seguimiento', className: 'bg-amber-500' },
  DEADLINE: { label: 'Fecha límite', className: 'bg-rose-500' },
  OTHER: { label: 'Otro', className: 'bg-slate-500' },
};

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; className: string }> = {
  PLANNED: {
    label: 'Planificado',
    className: 'bg-slate-200 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
  },
  ACTIVE: {
    label: 'En curso',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
  ON_HOLD: {
    label: 'En pausa',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  COMPLETED: {
    label: 'Completado',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  CANCELLED: {
    label: 'Cancelado',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  },
};

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; className: string }> = {
  DRAFT: {
    label: 'Borrador',
    className: 'bg-slate-200 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
  },
  SENT: {
    label: 'Enviado',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
  APPROVED: {
    label: 'Aprobado',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  REJECTED: {
    label: 'Rechazado',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  },
  EXPIRED: {
    label: 'Caducado',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
};

export const DOCUMENT_TYPE: Record<DocumentType, { label: string; icon: string }> = {
  CONTRACT: { label: 'Contrato', icon: '📄' },
  PROPOSAL: { label: 'Propuesta', icon: '📑' },
  INVOICE: { label: 'Factura', icon: '🧾' },
  MATERIAL: { label: 'Material', icon: '📎' },
  OTHER: { label: 'Otro', icon: '🔗' },
};

/** Helper para construir listas de <option>. */
export function options<T extends string>(map: Record<T, { label: string }>) {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value].label }));
}
