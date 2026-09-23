import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { centsToInput, fromDateInput, parseMoneyToCents, toDateInput } from '../../lib/format';
import { ApiError } from '../../services/api';
import { dealsService, type DealInput } from '../../services/deals.service';
import { stagesService } from '../../services/settings.service';
import type { Deal } from '../../types/models';
import { ContactSelect } from '../shared/ContactSelect';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';

interface DealFormProps {
  open: boolean;
  deal?: Deal | null;
  stageId?: string;
  contactId?: string;
  onClose: () => void;
}

export function DealForm({ open, deal, stageId, contactId, onClose }: DealFormProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify, notifyError } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: stages } = useQuery({ queryKey: ['stages'], queryFn: stagesService.list });

  const [form, setForm] = useState({
    title: deal?.title ?? '',
    description: deal?.description ?? '',
    contactId: deal?.contactId ?? contactId ?? '',
    stageId: deal?.stageId ?? stageId ?? '',
    amount: centsToInput(deal?.amountCents ?? 0),
    currency: deal?.currency ?? user?.currency ?? 'EUR',
    expectedCloseDate: toDateInput(deal?.expectedCloseDate),
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  // Si no había etapa preseleccionada, usa la primera en cuanto llegan las etapas.
  const effectiveStageId = form.stageId || stages?.items[0]?.id || '';

  const mutation = useMutation({
    mutationFn: (data: DealInput) => (deal ? dealsService.update(deal.id, data) : dealsService.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['contact'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      notify(deal ? 'Oportunidad actualizada' : 'Oportunidad creada');
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
    mutation.mutate({
      title: form.title,
      description: form.description,
      contactId: form.contactId || null,
      stageId: effectiveStageId,
      amountCents: parseMoneyToCents(form.amount),
      currency: form.currency,
      expectedCloseDate: fromDateInput(form.expectedCloseDate),
    });
  };

  return (
    <Modal
      open={open}
      title={deal ? 'Editar oportunidad' : 'Nueva oportunidad'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="deal-form" loading={mutation.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="deal-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Título" required error={errors.title}>
          {(id) => (
            <Input
              id={id}
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Rediseño web, contrato anual…"
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contacto" error={errors.contactId}>
            {(id) => <ContactSelect id={id} value={form.contactId} onChange={(v) => set('contactId', v)} />}
          </Field>
          <Field label="Etapa" required error={errors.stageId}>
            {(id) => (
              <Select id={id} value={effectiveStageId} onChange={(e) => set('stageId', e.target.value)}>
                {stages?.items.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name} ({stage.probability}%)
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Importe" error={errors.amountCents} className="sm:col-span-2">
            {(id) => (
              <Input
                id={id}
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="0,00"
              />
            )}
          </Field>
          <Field label="Moneda" error={errors.currency}>
            {(id) => (
              <Input
                id={id}
                maxLength={3}
                value={form.currency}
                onChange={(e) => set('currency', e.target.value.toUpperCase())}
              />
            )}
          </Field>
        </div>

        <Field label="Cierre estimado" error={errors.expectedCloseDate}>
          {(id) => (
            <Input
              id={id}
              type="date"
              value={form.expectedCloseDate}
              onChange={(e) => set('expectedCloseDate', e.target.value)}
            />
          )}
        </Field>

        <Field label="Descripción" error={errors.description}>
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
