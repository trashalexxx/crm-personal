import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { toDateTimeLocal } from '../../lib/format';
import { EVENT_TYPE, options } from '../../lib/labels';
import { ApiError } from '../../services/api';
import { eventsService, type EventInput } from '../../services/events.service';
import type { CalendarEvent, EventType } from '../../types/models';
import { ContactSelect } from '../shared/ContactSelect';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';

interface EventFormProps {
  open: boolean;
  event?: CalendarEvent | null;
  /** Fecha preseleccionada al crear desde una celda del calendario. */
  defaultDate?: Date;
  onClose: () => void;
}

export function EventForm({ open, event, defaultDate, onClose }: EventFormProps) {
  const queryClient = useQueryClient();
  const { notify, notifyError } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const start = event?.startsAt ? new Date(event.startsAt) : (defaultDate ?? new Date());
  const [form, setForm] = useState({
    title: event?.title ?? '',
    description: event?.description ?? '',
    location: event?.location ?? '',
    type: event?.type ?? ('MEETING' as EventType),
    startsAt: toDateTimeLocal(start),
    endsAt: toDateTimeLocal(event?.endsAt),
    allDay: event?.allDay ?? false,
    contactId: event?.contactId ?? '',
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const mutation = useMutation({
    mutationFn: (data: EventInput) =>
      event ? eventsService.update(event.id, data) : eventsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      notify(event ? 'Evento actualizado' : 'Evento creado');
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError) setErrors(error.fieldErrors);
      notifyError(error);
    },
  });

  const onSubmit = (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    setErrors({});
    mutation.mutate({
      title: form.title,
      description: form.description,
      location: form.location,
      type: form.type,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      allDay: form.allDay,
      contactId: form.contactId || null,
    });
  };

  return (
    <Modal
      open={open}
      title={event ? 'Editar evento' : 'Nuevo evento'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="event-form" loading={mutation.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="event-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Título" required error={errors.title}>
          {(id) => (
            <Input
              id={id}
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Reunión de seguimiento…"
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" error={errors.type}>
            {(id) => (
              <Select id={id} value={form.type} onChange={(e) => set('type', e.target.value as EventType)}>
                {options(EVENT_TYPE).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Contacto" error={errors.contactId}>
            {(id) => <ContactSelect id={id} value={form.contactId} onChange={(v) => set('contactId', v)} />}
          </Field>
          <Field label="Inicio" required error={errors.startsAt}>
            {(id) => (
              <Input
                id={id}
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(e) => set('startsAt', e.target.value)}
              />
            )}
          </Field>
          <Field label="Fin" error={errors.endsAt}>
            {(id) => (
              <Input
                id={id}
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => set('endsAt', e.target.value)}
              />
            )}
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.allDay}
            onChange={(e) => set('allDay', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Todo el día
        </label>

        <Field label="Lugar" error={errors.location}>
          {(id) => (
            <Input
              id={id}
              value={form.location ?? ''}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Oficina, videollamada, dirección…"
            />
          )}
        </Field>

        <Field label="Notas" error={errors.description}>
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
