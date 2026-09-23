import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DealForm } from '../components/deals/DealForm';
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  Field,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Textarea,
  cx,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate, formatMoney, fullName } from '../lib/format';
import { DEAL_STATUS } from '../lib/labels';
import { dealsService } from '../services/deals.service';
import { stagesService } from '../services/settings.service';
import type { Deal, DealStatus } from '../types/models';

export function PipelinePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify, notifyError } = useToast();
  const locale = user?.locale ?? 'es-ES';
  const currency = user?.currency ?? 'EUR';

  const [view, setView] = useState<'board' | 'closed'>('board');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [stageForNew, setStageForNew] = useState<string | undefined>();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [closing, setClosing] = useState<{ deal: Deal; status: DealStatus } | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [toDelete, setToDelete] = useState<Deal | null>(null);

  const { data: stages, isPending: stagesPending } = useQuery({
    queryKey: ['stages'],
    queryFn: stagesService.list,
  });
  const { data: deals, isPending, error, refetch } = useQuery({
    queryKey: ['deals'],
    queryFn: () => dealsService.list(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['deals'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['stages'] });
  };

  const move = useMutation({
    mutationFn: ({ id, stageId, position }: { id: string; stageId: string; position: number }) =>
      dealsService.move(id, stageId, position),
    onSuccess: invalidate,
    onError: notifyError,
  });

  const close = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: DealStatus; reason?: string }) =>
      dealsService.close(id, status, reason),
    onSuccess: (_, variables) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      notify(
        variables.status === 'WON'
          ? '¡Venta ganada! Registrada en el pipeline'
          : variables.status === 'LOST'
            ? 'Oportunidad marcada como perdida'
            : 'Oportunidad reabierta',
      );
      setClosing(null);
      setLostReason('');
    },
    onError: notifyError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => dealsService.remove(id),
    onSuccess: () => {
      invalidate();
      notify('Oportunidad eliminada');
      setToDelete(null);
    },
    onError: notifyError,
  });

  if (isPending || stagesPending) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const openDeals = deals.items.filter((deal) => deal.status === 'OPEN');
  const closedDeals = deals.items.filter((deal) => deal.status !== 'OPEN');
  const totalOpen = openDeals.reduce((sum, deal) => sum + deal.amountCents, 0);

  const onDrop = (stageId: string) => {
    if (!dragging) return;
    const deal = deals.items.find((d) => d.id === dragging);
    setDragging(null);
    setDragOverStage(null);
    if (!deal || (deal.stageId === stageId && deal.status === 'OPEN')) return;
    const position = openDeals.filter((d) => d.stageId === stageId).length;
    move.mutate({ id: deal.id, stageId, position });
  };

  return (
    <>
      <PageHeader
        title="Pipeline de ventas"
        subtitle={`${openDeals.length} oportunidad(es) abiertas · ${formatMoney(totalOpen, currency, locale)} en juego`}
        actions={
          <>
            <Select
              className="w-40"
              value={view}
              onChange={(e) => setView(e.target.value as typeof view)}
              aria-label="Cambiar vista"
            >
              <option value="board">Tablero</option>
              <option value="closed">Cerradas</option>
            </Select>
            <Button
              onClick={() => {
                setEditing(null);
                setStageForNew(undefined);
                setFormOpen(true);
              }}
            >
              Nueva oportunidad
            </Button>
          </>
        }
      />

      {view === 'board' ? (
        <div className="scrollbar-thin -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          {stages?.items.map((stage) => {
            const stageDeals = openDeals
              .filter((deal) => deal.stageId === stage.id)
              .sort((a, b) => a.position - b.position);
            const stageTotal = stageDeals.reduce((sum, deal) => sum + deal.amountCents, 0);

            return (
              <div
                key={stage.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverStage(stage.id);
                }}
                onDragLeave={() => setDragOverStage((current) => (current === stage.id ? null : current))}
                onDrop={() => onDrop(stage.id)}
                className={cx(
                  'flex w-72 shrink-0 flex-col rounded-xl border bg-slate-100/70 p-2 transition-colors dark:bg-slate-900/60',
                  dragOverStage === stage.id
                    ? 'border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10'
                    : 'border-slate-200 dark:border-slate-800',
                )}
              >
                <div className="mb-2 flex items-center gap-2 px-1.5 pt-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                  <h2 className="flex-1 truncate text-sm font-semibold">{stage.name}</h2>
                  <span className="text-xs text-slate-500">{stageDeals.length}</span>
                </div>
                <p className="mb-2 px-1.5 text-xs font-medium text-slate-500">
                  {formatMoney(stageTotal, currency, locale)}
                </p>

                <div className="flex-1 space-y-2">
                  {stageDeals.map((deal) => (
                    <article
                      key={deal.id}
                      draggable
                      onDragStart={() => setDragging(deal.id)}
                      onDragEnd={() => setDragging(null)}
                      className={cx(
                        'card cursor-grab p-3 active:cursor-grabbing',
                        dragging === deal.id && 'opacity-50',
                      )}
                    >
                      <p className="text-sm font-medium leading-snug">{deal.title}</p>
                      {deal.contact && (
                        <Link
                          to={`/contactos/${deal.contact.id}`}
                          className="mt-0.5 block truncate text-xs text-brand-600 hover:underline dark:text-brand-400"
                        >
                          {fullName(deal.contact)}
                        </Link>
                      )}
                      <p className="mt-1.5 text-sm font-semibold">
                        {formatMoney(deal.amountCents, deal.currency, locale)}
                      </p>
                      {deal.expectedCloseDate && (
                        <p className="text-xs text-slate-500">
                          Cierre: {formatDate(deal.expectedCloseDate, locale)}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-emerald-600 dark:text-emerald-400"
                          onClick={() => close.mutate({ id: deal.id, status: 'WON' })}
                        >
                          Ganada
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-brand-600 dark:text-brand-400"
                          onClick={() => setClosing({ deal, status: 'LOST' })}
                        >
                          Perdida
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(deal);
                            setFormOpen(true);
                          }}
                        >
                          Editar
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setStageForNew(stage.id);
                    setFormOpen(true);
                  }}
                  className="mt-2 w-full rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:hover:border-brand-500"
                >
                  + Añadir aquí
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {closedDeals.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Todavía no has cerrado ninguna oportunidad.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Oportunidad</th>
                  <th className="px-4 py-2.5 font-medium">Contacto</th>
                  <th className="px-4 py-2.5 font-medium">Importe</th>
                  <th className="px-4 py-2.5 font-medium">Cerrada</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {closedDeals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{deal.title}</p>
                      {deal.lostReason && (
                        <p className="text-xs text-slate-500">Motivo: {deal.lostReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {deal.contact ? (
                        <Link
                          to={`/contactos/${deal.contact.id}`}
                          className="text-brand-600 hover:underline dark:text-brand-400"
                        >
                          {fullName(deal.contact)}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium">
                      {formatMoney(deal.amountCents, deal.currency, locale)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{formatDate(deal.closedAt, locale)}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={DEAL_STATUS[deal.status].className}>
                        {DEAL_STATUS[deal.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => close.mutate({ id: deal.id, status: 'OPEN' })}
                      >
                        Reabrir
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-brand-600 dark:text-brand-400"
                        onClick={() => setToDelete(deal)}
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {formOpen && (
        <DealForm
          open
          deal={editing}
          stageId={stageForNew}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
            setStageForNew(undefined);
          }}
        />
      )}

      <Modal
        open={Boolean(closing)}
        title="Marcar oportunidad como perdida"
        onClose={() => setClosing(null)}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setClosing(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={close.isPending}
              onClick={() =>
                closing && close.mutate({ id: closing.deal.id, status: 'LOST', reason: lostReason })
              }
            >
              Marcar como perdida
            </Button>
          </>
        }
      >
        <Field label="Motivo de la pérdida" hint="Opcional, pero ayuda al analizar la conversión">
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Precio, plazos, eligió a otro proveedor…"
            />
          )}
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar oportunidad"
        message={`Se eliminará "${toDelete?.title ?? ''}" de forma permanente.`}
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </>
  );
}
