/** Modelos de datos que devuelve la API. Espejo del esquema Prisma del servidor. */

export type ContactStatus = 'LEAD' | 'ACTIVE' | 'RECURRING' | 'INACTIVE';
export type DealStatus = 'OPEN' | 'WON' | 'LOST';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type ActivityType = 'NOTE' | 'CALL' | 'MEETING' | 'EMAIL' | 'WHATSAPP' | 'OTHER';
export type EventType = 'MEETING' | 'CALL' | 'FOLLOW_UP' | 'DEADLINE' | 'OTHER';
export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type DocumentType = 'CONTRACT' | 'PROPOSAL' | 'INVOICE' | 'MATERIAL' | 'OTHER';

export interface User {
  id: string;
  email: string;
  name: string;
  currency: string;
  locale: string;
  theme: 'light' | 'dark' | 'system';
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  _count?: { contacts: number };
}

export interface ContactRef {
  id: string;
  firstName: string;
  lastName: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  website: string | null;
  linkedin: string | null;
  twitter: string | null;
  instagram: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  status: ContactStatus;
  source: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

export interface ContactDetail extends Contact {
  deals: Deal[];
  tasks: Task[];
  activities: Activity[];
  events: CalendarEvent[];
  projects: Project[];
  quotes: Quote[];
  documents: DocumentLink[];
}

export interface Stage {
  id: string;
  name: string;
  position: number;
  probability: number;
  color: string;
  _count?: { deals: number };
}

export interface Deal {
  id: string;
  title: string;
  description: string | null;
  contactId: string | null;
  stageId: string;
  amountCents: number;
  currency: string;
  status: DealStatus;
  lostReason: string | null;
  position: number;
  expectedCloseDate: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stage?: Stage;
  contact?: ContactRef | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  contactId: string | null;
  dealId: string | null;
  projectId: string | null;
  contact?: ContactRef | null;
  deal?: { id: string; title: string } | null;
  project?: { id: string; name: string } | null;
}

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  content: string | null;
  occurredAt: string;
  durationMin: number | null;
  contactId: string | null;
  dealId: string | null;
  projectId: string | null;
  contact?: ContactRef | null;
  deal?: { id: string; title: string } | null;
  project?: { id: string; name: string } | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  type: EventType;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  contactId: string | null;
  contact?: ContactRef | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  progress: number;
  contactId: string | null;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: ContactRef | null;
  _count?: { tasks: number };
}

export interface QuoteItem {
  id?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Quote {
  id: string;
  number: string;
  title: string;
  notes: string | null;
  status: QuoteStatus;
  currency: string;
  taxPercent: number;
  contactId: string | null;
  dealId: string | null;
  issueDate: string;
  validUntil: string | null;
  items: QuoteItem[];
  contact?: ContactRef | null;
  deal?: { id: string; title: string } | null;
}

export interface DocumentLink {
  id: string;
  name: string;
  url: string;
  description: string | null;
  type: DocumentType;
  contactId: string | null;
  dealId: string | null;
  projectId: string | null;
  quoteId: string | null;
  createdAt: string;
  contact?: ContactRef | null;
  deal?: { id: string; title: string } | null;
  project?: { id: string; name: string } | null;
  quote?: { id: string; number: string } | null;
}

export interface DuplicateGroup {
  reason: 'email' | 'phone' | 'name';
  value: string;
  contacts: ContactRef[];
}

export interface DashboardSummary {
  contacts: { total: number; lead: number; active: number; recurring: number; inactive: number };
  deals: {
    openCount: number;
    openAmountCents: number;
    wonThisMonthCount: number;
    wonThisMonthAmountCents: number;
  };
  tasks: { open: number; overdue: number };
  projects: { active: number };
  quotes: { pending: number };
  pipeline: { stageId: string; name: string; color: string; count: number; amountCents: number }[];
  upcomingEvents: CalendarEvent[];
  upcomingTasks: Task[];
  recentActivities: Activity[];
}

export interface ReportsData {
  period: { months: number; from: string };
  series: {
    month: string;
    wonAmountCents: number;
    lostAmountCents: number;
    wonCount: number;
    lostCount: number;
    createdCount: number;
    tasksCompleted: number;
  }[];
  conversion: {
    wonCount: number;
    lostCount: number;
    winRate: number;
    wonAmountCents: number;
    lostAmountCents: number;
    averageWonCents: number;
  };
  pipeline: { stageId: string; name: string; color: string; count: number; amountCents: number }[];
  contactsByStatus: { status: ContactStatus; count: number }[];
  quotesByStatus: { status: QuoteStatus; count: number }[];
  productivity: { created: number; completed: number; pending: number };
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
  preview: Record<string, unknown>[];
  dryRun?: boolean;
}
