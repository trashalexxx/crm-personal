import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { EventForm } from '../components/events/EventForm';
import { Button, ConfirmDialog, ErrorState, PageHeader, Spinner, cx } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime, formatTime, fullName } from '../lib/format';
import { EVENT_TYPE } from '../lib/labels';
import { eventsService } from '../services/events.service';
import type { CalendarEvent } from '../types/models';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Devuelve las 6 semanas visibles de un mes, empezando en lunes. */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // 0 = lunes
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function CalendarPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify, notifyError } = useToast();
  const locale = user?.locale ?? 'es-ES';

  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [toDelete, setToDelete] = useState<CalendarEvent | null>(null);

  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const range = { from: grid[0].toISOString(), to: grid[41].toISOString() };

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['events', range],
    queryFn: () => eventsService.list(range),
  });

  const remove = useMutation({
    mutationFn: (id: string) => eventsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      notify('Evento eliminado');
      setToDelete(null);
    },
    onError: notifyError,
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of data?.items ?? []) {
      const date = new Date(event.startsAt);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [data]);

  const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const selectedEvents = eventsByDay.get(dayKey(selected)) ?? [];

  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(cursor);

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Reuniones, llamadas y compromisos"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Nuevo evento
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="card p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold capitalize">{monthLabel}</h2>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                aria-label="Mes anterior"
              >
                ←
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelected(today);
                }}
              >
                Hoy
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                aria-label="Mes siguiente"
              >
                →
              </Button>
            </div>
          </div>

          {isPending ? (
            <Spinner />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : (
            <>
              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-slate-400">
                {WEEKDAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {grid.map((date) => {
                  const dayEvents = eventsByDay.get(dayKey(date)) ?? [];
                  const isCurrentMonth = date.getMonth() === cursor.getMonth();
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => setSelected(date)}
                      onDoubleClick={() => {
                        setSelected(date);
                        setEditing(null);
                        setFormOpen(true);
                      }}
                      className={cx(
                        'flex min-h-[64px] flex-col items-start gap-0.5 rounded-lg border p-1.5 text-left transition-colors sm:min-h-[84px]',
                        isCurrentMonth
                          ? 'border-slate-200 dark:border-slate-800'
                          : 'border-transparent text-slate-400',
                        sameDay(date, selected) && 'ring-2 ring-brand-500',
                        sameDay(date, today) && 'bg-brand-50 dark:bg-brand-500/10',
                      )}
                    >
                      <span className={cx('text-xs font-medium', sameDay(date, today) && 'text-brand-700 dark:text-brand-300')}>
                        {date.getDate()}
                      </span>
                      <span className="flex w-full flex-col gap-0.5">
                        {dayEvents.slice(0, 2).map((event) => (
                          <span
                            key={event.id}
                            className={cx(
                              'truncate rounded px-1 py-0.5 text-[10px] font-medium text-white',
                              EVENT_TYPE[event.type].className,
                            )}
                          >
                            {event.title}
                          </span>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[10px] text-slate-400">+{dayEvents.length - 2} más</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Doble clic en un día para crear un evento en esa fecha.
              </p>
            </>
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">
            {new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(selected)}
          </h2>
          {selectedEvents.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Sin eventos este día.</p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((event) => (
                <li key={event.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <div className="flex items-start gap-2">
                    <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', EVENT_TYPE[event.type].className)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-slate-500">
                        {event.allDay
                          ? 'Todo el día'
                          : `${formatTime(event.startsAt, locale)}${event.endsAt ? ` – ${formatTime(event.endsAt, locale)}` : ''}`}
                      </p>
                      {event.location && <p className="text-xs text-slate-500">📍 {event.location}</p>}
                      {event.contact && (
                        <p className="text-xs text-slate-500">👤 {fullName(event.contact)}</p>
                      )}
                      {event.description && (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(event);
                        setFormOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-brand-600 dark:text-brand-400"
                      onClick={() => setToDelete(event)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Próximos eventos
            </h3>
            <ul className="space-y-1.5">
              {(data?.items ?? [])
                .filter((event) => new Date(event.startsAt) >= today)
                .slice(0, 5)
                .map((event) => (
                  <li key={event.id} className="text-xs">
                    <span className="font-medium">{event.title}</span>
                    <span className="block text-slate-500">{formatDateTime(event.startsAt, locale)}</span>
                  </li>
                ))}
              {(data?.items ?? []).filter((event) => new Date(event.startsAt) >= today).length === 0 && (
                <li className="text-xs text-slate-500">Nada programado este mes.</li>
              )}
            </ul>
          </div>
        </section>
      </div>

      {formOpen && (
        <EventForm
          open
          event={editing}
          defaultDate={selected}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar evento"
        message={`Se eliminará "${toDelete?.title ?? ''}" de tu agenda.`}
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </>
  );
}
