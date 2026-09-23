import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ContactsView } from '../components/contacts/ContactsView';
import { Button, PageHeader, cx } from '../components/ui';
import { CONTACT_STATUS } from '../lib/labels';
import { dashboardService } from '../services/insights.service';
import type { ContactStatus } from '../types/models';

const TABS: { status: ContactStatus; description: string }[] = [
  { status: 'LEAD', description: 'Contactos que aún no han comprado' },
  { status: 'ACTIVE', description: 'Clientes con relación comercial en marcha' },
  { status: 'RECURRING', description: 'Clientes que repiten de forma habitual' },
  { status: 'INACTIVE', description: 'Sin actividad reciente' },
];

export function ClientsPage() {
  const [active, setActive] = useState<ContactStatus>('ACTIVE');
  const [createSignal, setCreateSignal] = useState(0);

  const { data: summary } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardService.summary });

  const counts: Record<ContactStatus, number> = {
    LEAD: summary?.contacts.lead ?? 0,
    ACTIVE: summary?.contacts.active ?? 0,
    RECURRING: summary?.contacts.recurring ?? 0,
    INACTIVE: summary?.contacts.inactive ?? 0,
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={TABS.find((tab) => tab.status === active)?.description}
        actions={<Button onClick={() => setCreateSignal((n) => n + 1)}>Nuevo cliente</Button>}
      />

      <div
        className="scrollbar-thin mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900"
        role="tablist"
      >
        {TABS.map((tab) => (
          <button
            key={tab.status}
            role="tab"
            aria-selected={active === tab.status}
            onClick={() => setActive(tab.status)}
            className={cx(
              'flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active === tab.status
                ? 'bg-brand-600 text-white shadow-glow'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            {CONTACT_STATUS[tab.status].label}
            <span className={cx('ml-1.5 text-xs', active === tab.status ? 'text-white/80' : 'text-slate-400')}>
              {counts[tab.status]}
            </span>
          </button>
        ))}
      </div>

      <ContactsView key={active} lockedStatus={active} createSignal={createSignal} />
    </>
  );
}
