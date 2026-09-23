import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ActivityForm } from '../components/activities/ActivityForm';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  Spinner,
  cx,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime, fullName } from '../lib/format';
import { ACTIVITY_TYPE } from '../lib/labels';
import { activitiesService } from '../services/activities.service';
import type { Activity, ActivityType } from '../types/models';

/** Agrupa por día para el eje temporal del historial. */
function groupByDay(activities: Activity[], locale: string) {
  const groups = new Map<string, Activity[]>();
  for (const activity of activities) {
    const date = new Date(activity.occurredAt);
    const key = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
    groups.set(key, [...(groups.get(key) ?? []), activity]);
  }
  return [...groups.entries()];
}

export function ActivitiesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify, notifyError } = useToast();
  const locale = user?.locale ?? 'es-ES';

  const [type, setType] = useState<ActivityType | ''>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [toDelete, setToDelete] = useState<Activity | null>(null);

  const filters = { type: type || undefined, take: 200 };
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['activities', filters],
    queryFn: () => activitiesService.list(filters),
  });

  const remove = useMutation({
    mutationFn: (id: string) => activitiesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      notify('Interacción eliminada');
      setToDelete(null);
    },
    onError: notifyError,
  });

  return (
    <>
      <PageHeader
        title="Historial de interacciones"
        subtitle="Registro cronológico de conversaciones, llamadas y reuniones"
        actions={
          <>
            <Select
              className="w-44"
              value={type}
              onChange={(e) => setType(e.target.value as ActivityType | '')}
              aria-label="Filtrar por tipo"
            >
              <option value="">Todos los tipos</option>
              {(Object.keys(ACTIVITY_TYPE) as ActivityType[]).map((key) => (
                <option key={key} value={key}>
                  {ACTIVITY_TYPE[key].label}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Registrar interacción
            </Button>
          </>
        }
      />

      {isPending ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="💬"
            title="Sin interacciones registradas"
            description="Anota aquí lo que hablas con tus contactos para no perder el hilo."
            action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Registrar la primera
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {groupByDay(data.items, locale).map(([day, activities]) => (
            <section key={day}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{day}</h2>
              <ol className="relative space-y-3 border-l border-slate-200 pl-6 dark:border-slate-800">
                {activities.map((activity) => (
                  <li key={activity.id} className="relative">
                    <span
                      className={cx(
                        'absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full text-xs',
                        ACTIVITY_TYPE[activity.type].className,
                      )}
                      aria-hidden
                    >
                      {ACTIVITY_TYPE[activity.type].icon}
                    </span>
                    <div className="card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{activity.subject}</p>
                          <p className="text-xs text-slate-500">
                            {ACTIVITY_TYPE[activity.type].label} ·{' '}
                            {formatDateTime(activity.occurredAt, locale)}
                            {activity.durationMin ? ` · ${activity.durationMin} min` : ''}
                          </p>
                          {activity.contact && (
                            <Link
                              to={`/contactos/${activity.contact.id}`}
                              className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                            >
                              {fullName(activity.contact)}
                            </Link>
                          )}
                          {activity.content && (
                            <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                              {activity.content}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(activity);
                              setFormOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-brand-600 dark:text-brand-400"
                            onClick={() => setToDelete(activity)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {formOpen && (
        <ActivityForm
          open
          activity={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar interacción"
        message={`Se eliminará "${toDelete?.subject ?? ''}" del historial.`}
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </>
  );
}
