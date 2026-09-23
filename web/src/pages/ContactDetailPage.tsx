import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ActivityForm } from '../components/activities/ActivityForm';
import { ContactForm } from '../components/contacts/ContactForm';
import { DealForm } from '../components/deals/DealForm';
import { TaskForm } from '../components/tasks/TaskForm';
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  PageHeader,
  ProgressBar,
  Spinner,
  cx,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  fullName,
  initials,
  isOverdue,
  whatsappDigits,
} from '../lib/format';
import {
  ACTIVITY_TYPE,
  CONTACT_STATUS,
  DEAL_STATUS,
  PROJECT_STATUS,
  QUOTE_STATUS,
  TASK_PRIORITY,
  TASK_STATUS,
} from '../lib/labels';
import { contactsService } from '../services/contacts.service';
import { tasksService } from '../services/tasks.service';

function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <span className="w-28 shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </div>
  );
}

export function ContactDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify, notifyError } = useToast();
  const locale = user?.locale ?? 'es-ES';
  const currency = user?.currency ?? 'EUR';

  const [editOpen, setEditOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: contact, isPending, error, refetch } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsService.get(id),
    enabled: Boolean(id),
  });

  const remove = useMutation({
    mutationFn: () => contactsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      notify('Contacto eliminado');
      navigate('/contactos', { replace: true });
    },
    onError: notifyError,
  });

  const toggleTask = useMutation({
    mutationFn: (taskId: string) => tasksService.toggle(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: notifyError,
  });

  if (isPending) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const whatsapp = whatsappDigits(contact.phone);
  const openDeals = contact.deals.filter((deal) => deal.status === 'OPEN');
  const openValue = openDeals.reduce((sum, deal) => sum + deal.amountCents, 0);
  const wonValue = contact.deals
    .filter((deal) => deal.status === 'WON')
    .reduce((sum, deal) => sum + deal.amountCents, 0);

  return (
    <>
      <Link
        to="/contactos"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      >
        ← Volver a contactos
      </Link>

      <PageHeader
        title={fullName(contact)}
        subtitle={[contact.position, contact.company].filter(Boolean).join(' · ') || undefined}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setActivityOpen(true)}>
              Registrar interacción
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setTaskOpen(true)}>
              Nueva tarea
            </Button>
            <Button size="sm" onClick={() => setDealOpen(true)}>
              Nueva oportunidad
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <section className="card p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white">
                {initials(fullName(contact))}
              </span>
              <div className="min-w-0">
                <Badge className={CONTACT_STATUS[contact.status].className}>
                  {CONTACT_STATUS[contact.status].label}
                </Badge>
                {contact.source && <p className="mt-1 text-xs text-slate-500">Origen: {contact.source}</p>}
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <DataRow label="Correo">
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="text-brand-600 hover:underline dark:text-brand-400">
                    {contact.email}
                  </a>
                ) : (
                  '—'
                )}
              </DataRow>
              <DataRow label="Teléfono">{contact.phone ?? '—'}</DataRow>
              <DataRow label="Empresa">{contact.company ?? '—'}</DataRow>
              <DataRow label="Cargo">{contact.position ?? '—'}</DataRow>
              <DataRow label="Dirección">
                {[contact.address, contact.city, contact.country].filter(Boolean).join(', ') || '—'}
              </DataRow>
              <DataRow label="Web">
                {contact.website ? (
                  <a
                    href={contact.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {contact.website}
                  </a>
                ) : (
                  '—'
                )}
              </DataRow>
              <DataRow label="Redes">
                {[contact.linkedin, contact.twitter, contact.instagram].filter(Boolean).join(' · ') || '—'}
              </DataRow>
              <DataRow label="Etiquetas">
                {contact.tags.length ? (
                  <span className="flex flex-wrap gap-1">
                    {contact.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </span>
                ) : (
                  '—'
                )}
              </DataRow>
            </div>

            {/* Enlaces externos: abren otra aplicación, no envían nada desde el CRM. */}
            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="w-full sm:w-auto">
                  <Button variant="secondary" size="sm" className="w-full">
                    ✉️ Escribir correo
                  </Button>
                </a>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="w-full sm:w-auto"
                >
                  <Button variant="secondary" size="sm" className="w-full">
                    💬 Abrir WhatsApp
                  </Button>
                </a>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Estos botones abren tu cliente de correo o WhatsApp Web. El CRM no envía mensajes ni
              registra automáticamente esas conversaciones: regístralas como interacción si quieres
              dejarlas en el historial.
            </p>

            <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-brand-600 dark:text-brand-400"
                onClick={() => setConfirmDelete(true)}
              >
                Eliminar
              </Button>
            </div>
          </section>

          {contact.notes && (
            <section className="card p-4">
              <h2 className="mb-2 text-sm font-semibold">Notas</h2>
              <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{contact.notes}</p>
            </section>
          )}

          <section className="card grid grid-cols-2 gap-3 p-4">
            <div>
              <p className="text-xs text-slate-500">Pipeline abierto</p>
              <p className="text-lg font-semibold">{formatMoney(openValue, currency, locale)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Ventas ganadas</p>
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {formatMoney(wonValue, currency, locale)}
              </p>
            </div>
          </section>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <section className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">Oportunidades ({contact.deals.length})</h2>
            {contact.deals.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">Sin oportunidades registradas.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {contact.deals.map((deal) => (
                  <li key={deal.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{deal.title}</p>
                      <p className="text-xs text-slate-500">
                        {deal.stage?.name}
                        {deal.expectedCloseDate && ` · cierre previsto ${formatDate(deal.expectedCloseDate, locale)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatMoney(deal.amountCents, deal.currency, locale)}
                      </span>
                      <Badge className={DEAL_STATUS[deal.status].className}>
                        {DEAL_STATUS[deal.status].label}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">Tareas ({contact.tasks.length})</h2>
            {contact.tasks.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">Sin tareas asociadas.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {contact.tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={task.status === 'DONE'}
                      onChange={() => toggleTask.mutate(task.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      aria-label={`Marcar "${task.title}" como completada`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cx('truncate text-sm', task.status === 'DONE' && 'text-slate-400 line-through')}>
                        {task.title}
                      </p>
                      <p
                        className={cx(
                          'text-xs',
                          isOverdue(task.dueDate) && task.status !== 'DONE'
                            ? 'font-medium text-brand-600 dark:text-brand-400'
                            : 'text-slate-500',
                        )}
                      >
                        {task.dueDate ? formatDate(task.dueDate, locale) : 'Sin fecha'}
                      </p>
                    </div>
                    <Badge className={TASK_PRIORITY[task.priority].className}>
                      {TASK_PRIORITY[task.priority].label}
                    </Badge>
                    <Badge className={TASK_STATUS[task.status].className}>
                      {TASK_STATUS[task.status].label}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Historial de interacciones</h2>
              <Button size="sm" variant="secondary" onClick={() => setActivityOpen(true)}>
                Añadir
              </Button>
            </div>
            {contact.activities.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">
                Todavía no hay interacciones registradas.
              </p>
            ) : (
              <ol className="relative space-y-4 border-l border-slate-200 pl-5 dark:border-slate-800">
                {contact.activities.map((activity) => (
                  <li key={activity.id} className="relative">
                    <span
                      className={cx(
                        'absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
                        ACTIVITY_TYPE[activity.type].className,
                      )}
                      aria-hidden
                    >
                      {ACTIVITY_TYPE[activity.type].icon}
                    </span>
                    <p className="text-sm font-medium">{activity.subject}</p>
                    <p className="text-xs text-slate-500">
                      {ACTIVITY_TYPE[activity.type].label} · {formatDateTime(activity.occurredAt, locale)}
                      {activity.durationMin ? ` · ${activity.durationMin} min` : ''}
                    </p>
                    {activity.content && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                        {activity.content}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {(contact.projects.length > 0 || contact.quotes.length > 0 || contact.documents.length > 0) && (
            <section className="card p-4">
              <h2 className="mb-3 text-sm font-semibold">Relacionado</h2>
              <div className="space-y-3">
                {contact.projects.map((project) => (
                  <div key={project.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">📁 {project.name}</p>
                      <Badge className={PROJECT_STATUS[project.status].className}>
                        {PROJECT_STATUS[project.status].label}
                      </Badge>
                    </div>
                    <ProgressBar value={project.progress} className="mt-2" />
                  </div>
                ))}
                {contact.quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <p className="truncate text-sm font-medium">🧾 {quote.number} · {quote.title}</p>
                    <Badge className={QUOTE_STATUS[quote.status].className}>
                      {QUOTE_STATUS[quote.status].label}
                    </Badge>
                  </div>
                ))}
                {contact.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <span className="truncate">🔗 {doc.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">Abrir</span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {editOpen && <ContactForm open contact={contact} onClose={() => setEditOpen(false)} />}
      {activityOpen && (
        <ActivityForm open contactId={contact.id} onClose={() => setActivityOpen(false)} />
      )}
      {taskOpen && <TaskForm open contactId={contact.id} onClose={() => setTaskOpen(false)} />}
      {dealOpen && <DealForm open contactId={contact.id} onClose={() => setDealOpen(false)} />}

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar contacto"
        message="Se eliminarán también sus interacciones. Las oportunidades y tareas quedarán sin contacto asociado."
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
