import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TaskForm } from '../components/tasks/TaskForm';
import {
  Badge,
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
import { formatDate, fullName, isOverdue } from '../lib/format';
import { TASK_PRIORITY, TASK_STATUS } from '../lib/labels';
import { tasksService, type TaskFilters } from '../services/tasks.service';
import type { Task, TaskPriority } from '../types/models';

const SCOPES: { value: NonNullable<TaskFilters['scope']>; label: string }[] = [
  { value: 'open', label: 'Pendientes' },
  { value: 'overdue', label: 'Vencidas' },
  { value: 'today', label: 'Para hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'all', label: 'Todas' },
];

export function TasksPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify, notifyError } = useToast();
  const locale = user?.locale ?? 'es-ES';

  const [scope, setScope] = useState<NonNullable<TaskFilters['scope']>>('open');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [toDelete, setToDelete] = useState<Task | null>(null);

  const filters: TaskFilters = { scope, priority: priority || undefined };
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksService.list(filters),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const toggle = useMutation({
    mutationFn: (id: string) => tasksService.toggle(id),
    onSuccess: invalidate,
    onError: notifyError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => tasksService.remove(id),
    onSuccess: () => {
      invalidate();
      notify('Tarea eliminada');
      setToDelete(null);
    },
    onError: notifyError,
  });

  const overdueCount = data?.items.filter((t) => isOverdue(t.dueDate) && t.status !== 'DONE').length ?? 0;

  return (
    <>
      <PageHeader
        title="Tareas y recordatorios"
        subtitle={overdueCount > 0 ? `${overdueCount} tarea(s) vencida(s) en esta vista` : undefined}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Nueva tarea
          </Button>
        }
      />

      <div className="card mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="scrollbar-thin flex gap-1 overflow-x-auto" role="tablist">
          {SCOPES.map((item) => (
            <button
              key={item.value}
              role="tab"
              aria-selected={scope === item.value}
              onClick={() => setScope(item.value)}
              className={cx(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                scope === item.value
                  ? 'bg-brand-600 text-white shadow-glow'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Select
          className="sm:w-44"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority | '')}
          aria-label="Filtrar por prioridad"
        >
          <option value="">Todas las prioridades</option>
          {(Object.keys(TASK_PRIORITY) as TaskPriority[]).map((key) => (
            <option key={key} value={key}>
              {TASK_PRIORITY[key].label}
            </option>
          ))}
        </Select>
      </div>

      {isPending ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="✅"
            title="No hay tareas en esta vista"
            description="Crea una tarea o cambia el filtro para ver otras."
            action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Nueva tarea
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {data.items.map((task) => {
            const overdue = isOverdue(task.dueDate) && task.status !== 'DONE';
            return (
              <li
                key={task.id}
                className={cx(
                  'card flex items-start gap-3 p-3',
                  overdue && 'border-l-4 border-l-brand-500',
                )}
              >
                <input
                  type="checkbox"
                  checked={task.status === 'DONE'}
                  onChange={() => toggle.mutate(task.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  aria-label={`Marcar "${task.title}" como completada`}
                />
                <div className="min-w-0 flex-1">
                  <p className={cx('text-sm font-medium', task.status === 'DONE' && 'text-slate-400 line-through')}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{task.description}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className={overdue ? 'font-medium text-brand-600 dark:text-brand-400' : 'text-slate-500'}>
                      {task.dueDate ? `${overdue ? '⚠ Venció el ' : 'Vence el '}${formatDate(task.dueDate, locale)}` : 'Sin fecha'}
                    </span>
                    {task.contact && (
                      <Link
                        to={`/contactos/${task.contact.id}`}
                        className="text-brand-600 hover:underline dark:text-brand-400"
                      >
                        {fullName(task.contact)}
                      </Link>
                    )}
                    {task.deal && <span className="text-slate-500">💼 {task.deal.title}</span>}
                    {task.project && <span className="text-slate-500">📁 {task.project.name}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="flex gap-1.5">
                    <Badge className={TASK_PRIORITY[task.priority].className} dot={TASK_PRIORITY[task.priority].dot}>
                      {TASK_PRIORITY[task.priority].label}
                    </Badge>
                    <Badge className={TASK_STATUS[task.status].className}>
                      {TASK_STATUS[task.status].label}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(task);
                        setFormOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-brand-600 dark:text-brand-400"
                      onClick={() => setToDelete(task)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {formOpen && (
        <TaskForm
          open
          task={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar tarea"
        message={`Se eliminará "${toDelete?.title ?? ''}".`}
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </>
  );
}
