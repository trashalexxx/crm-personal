import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { toDateTimeLocal } from '../../lib/format';
import { ACTIVITY_TYPE, options } from '../../lib/labels';
import { ApiError } from '../../services/api';
import { activitiesService, type ActivityInput } from '../../services/activities.service';
import type { Activity, ActivityType } from '../../types/models';
import { ContactSelect } from '../shared/ContactSelect';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';

interface ActivityFormProps {
  open: boolean;
  activity?: Activity | null;
  contactId?: string;
  dealId?: string;
  projectId?: string;
  onClose: () => void;
}

export function ActivityForm({ open, activity, contactId, dealId, projectId, onClose }: ActivityFormProps) {
  const queryClient = useQueryClient();
  const { notify, notifyError } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<ActivityInput & { occurredAtLocal: string }>({
    type: activity?.type ?? 'NOTE',
    subject: activity?.subject ?? '',
    content: activity?.content ?? '',
    durationMin: activity?.durationMin ?? null,
    contactId: activity?.contactId ?? contactId ?? '',
    dealId: activity?.dealId ?? dealId ?? null,
    projectId: activity?.projectId ?? projectId ?? null,
    occurredAtLocal: toDateTimeLocal(activity?.occurredAt ?? new Date()),
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const mutation = useMutation({
    mutationFn: (data: ActivityInput) =>
      activity ? activitiesService.update(activity.id, data) : activitiesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['contact'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      notify(activity ? 'Interacción actualizada' : 'Interacción registrada');
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError) setErrors(error.fieldErrors);
      notifyError(error);
    },
  });

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    const { occurredAtLocal, ...rest } = form;
    mutation.mutate({
      ...rest,
      occurredAt: occurredAtLocal ? new Date(occurredAtLocal).toISOString() : null,
    });
  };

  return (
    <Modal
      open={open}
      title={activity ? 'Editar interacción' : 'Registrar interacción'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="activity-form" loading={mutation.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="activity-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" error={errors.type}>
            {(id) => (
              <Select id={id} value={form.type} onChange={(e) => set('type', e.target.value as ActivityType)}>
                {options(ACTIVITY_TYPE).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Fecha y hora" error={errors.occurredAt}>
            {(id) => (
              <Input
                id={id}
                type="datetime-local"
                value={form.occurredAtLocal}
                onChange={(e) => set('occurredAtLocal', e.target.value)}
              />
            )}
          </Field>
        </div>

        <Field label="Asunto" required error={errors.subject}>
          {(id) => (
            <Input
              id={id}
              required
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
              placeholder="Llamada de seguimiento, reunión inicial…"
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contacto" error={errors.contactId}>
            {(id) => (
              <ContactSelect id={id} value={form.contactId ?? ''} onChange={(v) => set('contactId', v)} />
            )}
          </Field>
          <Field label="Duración (minutos)" error={errors.durationMin}>
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                max={1440}
                value={form.durationMin ?? ''}
                onChange={(e) => set('durationMin', e.target.value === '' ? null : Number(e.target.value))}
              />
            )}
          </Field>
        </div>

        <Field label="Detalle" error={errors.content}>
          {(id) => (
            <Textarea
              id={id}
              rows={4}
              value={form.content ?? ''}
              onChange={(e) => set('content', e.target.value)}
              placeholder="Qué se habló, acuerdos, próximos pasos…"
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
