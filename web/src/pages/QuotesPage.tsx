import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ContactSelect } from '../components/shared/ContactSelect';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Textarea,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  centsToInput,
  formatDate,
  formatMoney,
  fromDateInput,
  fullName,
  parseMoneyToCents,
  toDateInput,
} from '../lib/format';
import { QUOTE_STATUS, options } from '../lib/labels';
import { ApiError } from '../services/api';
import { quotesService, type QuoteInput } from '../services/quotes.service';
import type { Quote, QuoteItem, QuoteStatus } from '../types/models';

interface EditableItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

const toEditable = (items: QuoteItem[]): EditableItem[] =>
  items.length
    ? items.map((item) => ({
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: centsToInput(item.unitPriceCents),
      }))
    : [{ description: '', quantity: '1', unitPrice: '0.00' }];

function computeTotals(items: EditableItem[], taxPercent: number) {
  const subtotal = items.reduce(
    (sum, item) => sum + Math.round(Number(item.quantity || 0) * parseMoneyToCents(item.unitPrice)),
    0,
  );
  const tax = Math.round((subtotal * taxPercent) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

function QuoteForm({ open, quote, onClose }: { open: boolean; quote: Quote | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify, notifyError } = useToast();
  const locale = user?.locale ?? 'es-ES';
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Al crear, pide al servidor el siguiente número libre.
  const { data: suggested } = useQuery({
    queryKey: ['quote-next-number'],
    queryFn: quotesService.nextNumber,
    enabled: !quote,
  });

  const [form, setForm] = useState({
    number: quote?.number ?? '',
    title: quote?.title ?? '',
    notes: quote?.notes ?? '',
    status: quote?.status ?? ('DRAFT' as QuoteStatus),
    currency: quote?.currency ?? user?.currency ?? 'EUR',
    taxPercent: quote?.taxPercent ?? 21,
    contactId: quote?.contactId ?? '',
    issueDate: toDateInput(quote?.issueDate ?? new Date()),
    validUntil: toDateInput(quote?.validUntil),
  });
  const [items, setItems] = useState<EditableItem[]>(toEditable(quote?.items ?? []));

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const number = form.number || suggested?.number || '';
  const totals = computeTotals(items, Number(form.taxPercent) || 0);

  const mutation = useMutation({
    mutationFn: (data: QuoteInput) =>
      quote ? quotesService.update(quote.id, data) : quotesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      notify(quote ? 'Presupuesto actualizado' : 'Presupuesto creado');
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError) setErrors(error.fieldErrors);
      notifyError(error);
    },
  });

  const updateItem = (index: number, key: keyof EditableItem, value: string) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)));

  return (
    <Modal
      open={open}
      title={quote ? `Editar ${quote.number}` : 'Nuevo presupuesto'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="quote-form" loading={mutation.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form
        id="quote-form"
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setErrors({});
          mutation.mutate({
            number,
            title: form.title,
            notes: form.notes,
            status: form.status,
            currency: form.currency,
            taxPercent: Number(form.taxPercent) || 0,
            contactId: form.contactId || null,
            issueDate: fromDateInput(form.issueDate),
            validUntil: fromDateInput(form.validUntil),
            items: items
              .filter((item) => item.description.trim())
              .map((item) => ({
                description: item.description,
                quantity: Number(item.quantity) || 0,
                unitPriceCents: parseMoneyToCents(item.unitPrice),
              })),
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Número" required error={errors.number}>
            {(id) => (
              <Input id={id} required value={number} onChange={(e) => set('number', e.target.value)} />
            )}
          </Field>
          <Field label="Estado" error={errors.status}>
            {(id) => (
              <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value as QuoteStatus)}>
                {options(QUOTE_STATUS).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Título" required error={errors.title}>
          {(id) => (
            <Input
              id={id}
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Propuesta de diseño web"
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cliente" error={errors.contactId}>
            {(id) => <ContactSelect id={id} value={form.contactId} onChange={(v) => set('contactId', v)} />}
          </Field>
          <Field label="Fecha de emisión" error={errors.issueDate}>
            {(id) => (
              <Input id={id} type="date" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} />
            )}
          </Field>
          <Field label="Válido hasta" error={errors.validUntil}>
            {(id) => (
              <Input id={id} type="date" value={form.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
            )}
          </Field>
        </div>

        <div>
          <p className="label">Conceptos</p>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="Descripción del concepto"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  aria-label={`Concepto ${index + 1}`}
                />
                <Input
                  className="w-20"
                  inputMode="decimal"
                  placeholder="Cant."
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  aria-label={`Cantidad del concepto ${index + 1}`}
                />
                <Input
                  className="w-28"
                  inputMode="decimal"
                  placeholder="Precio"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                  aria-label={`Precio unitario del concepto ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="shrink-0 text-brand-600 dark:text-brand-400"
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                  aria-label={`Eliminar concepto ${index + 1}`}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => setItems((current) => [...current, { description: '', quantity: '1', unitPrice: '0.00' }])}
          >
            + Añadir concepto
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="IVA / impuesto (%)" error={errors.taxPercent}>
            {(id) => (
              <Input
                id={id}
                type="number"
                min={0}
                max={100}
                value={form.taxPercent}
                onChange={(e) => set('taxPercent', Number(e.target.value))}
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

        <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatMoney(totals.subtotal, form.currency, locale)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Impuesto ({form.taxPercent}%)</span>
            <span>{formatMoney(totals.tax, form.currency, locale)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold dark:border-slate-700">
            <span>Total</span>
            <span>{formatMoney(totals.total, form.currency, locale)}</span>
          </div>
        </div>

        <Field label="Notas y condiciones" error={errors.notes}>
          {(id) => (
            <Textarea id={id} rows={3} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
          )}
        </Field>
      </form>
    </Modal>
  );
}

export function QuotesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify, notifyError } = useToast();
  const locale = user?.locale ?? 'es-ES';

  const [status, setStatus] = useState<QuoteStatus | ''>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [toDelete, setToDelete] = useState<Quote | null>(null);

  const filters = { status: status || undefined };
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['quotes', filters],
    queryFn: () => quotesService.list(filters),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['quotes'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const setStatusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: QuoteStatus }) => quotesService.setStatus(id, next),
    onSuccess: () => {
      invalidate();
      notify('Estado actualizado');
    },
    onError: notifyError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => quotesService.remove(id),
    onSuccess: () => {
      invalidate();
      notify('Presupuesto eliminado');
      setToDelete(null);
    },
    onError: notifyError,
  });

  const quoteTotal = (quote: Quote) => {
    const subtotal = quote.items.reduce(
      (sum, item) => sum + Math.round(item.quantity * item.unitPriceCents),
      0,
    );
    return subtotal + Math.round((subtotal * quote.taxPercent) / 100);
  };

  return (
    <>
      <PageHeader
        title="Presupuestos y cotizaciones"
        subtitle="Propuestas comerciales y su estado de aprobación"
        actions={
          <>
            <Select
              className="w-44"
              value={status}
              onChange={(e) => setStatus(e.target.value as QuoteStatus | '')}
              aria-label="Filtrar por estado"
            >
              <option value="">Todos los estados</option>
              {(Object.keys(QUOTE_STATUS) as QuoteStatus[]).map((key) => (
                <option key={key} value={key}>
                  {QUOTE_STATUS[key].label}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Nuevo presupuesto
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
            icon="🧾"
            title="Sin presupuestos"
            description="Registra tus propuestas comerciales para seguir su aprobación."
            action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Nuevo presupuesto
              </Button>
            }
          />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-2.5 font-medium">Número</th>
                <th className="px-4 py-2.5 font-medium">Título</th>
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium">Emisión</th>
                <th className="px-4 py-2.5 font-medium">Total</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.items.map((quote) => (
                <tr key={quote.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-2.5 font-medium">{quote.number}</td>
                  <td className="px-4 py-2.5">{quote.title}</td>
                  <td className="px-4 py-2.5">{quote.contact ? fullName(quote.contact) : '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500">{formatDate(quote.issueDate, locale)}</td>
                  <td className="px-4 py-2.5 font-semibold">
                    {formatMoney(quoteTotal(quote), quote.currency, locale)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Select
                      className="w-32 py-1 text-xs"
                      value={quote.status}
                      onChange={(e) =>
                        setStatusMutation.mutate({ id: quote.id, next: e.target.value as QuoteStatus })
                      }
                      aria-label={`Estado de ${quote.number}`}
                    >
                      {options(QUOTE_STATUS).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(quote);
                        setFormOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-brand-600 dark:text-brand-400"
                      onClick={() => setToDelete(quote)}
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.items.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(QUOTE_STATUS) as QuoteStatus[]).map((key) => {
            const count = data.items.filter((quote) => quote.status === key).length;
            if (!count) return null;
            return (
              <Badge key={key} className={QUOTE_STATUS[key].className}>
                {QUOTE_STATUS[key].label}: {count}
              </Badge>
            );
          })}
        </div>
      ) : null}

      {formOpen && (
        <QuoteForm
          open
          quote={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar presupuesto"
        message={`Se eliminará ${toDelete?.number ?? ''} y sus conceptos.`}
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </>
  );
}
