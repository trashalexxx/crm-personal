import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { fromDateInput, toDateInput } from '../../lib/format';
import { TASK_PRIORITY, TASK_STATUS, options } from '../../lib/labels';
import { ApiError } from '../../services/api';
import { dealsService } from '../../services/deals.service';
import { projectsService } from '../../services/projects.service';
import { tasksService, type TaskInput } from '../../services/tasks.service';
import type { Task, TaskPriority, TaskStatus } from '../../types/models';
import { ContactSelect } from '../shared/ContactSelect';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';

interface TaskFormProps {
  open: boolean;
  task?: Task | null;
  contactId?: string;
  dealId?: string;
  projectId?: string;
  onClose: () => void;
}

export function TaskForm({ open, task, contactId, dealId, projectId, onClose }: TaskFormProps) {
  const queryClient = useQueryClient();
  const { notify, notifyError } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? ('MEDIUM' as TaskPriority),
    status: task?.status ?? ('PENDING' as TaskStatus),
    dueDate: toDateInput(task?.dueDate),
    contactId: task?.contactId ?? contactId ?? '',
    dealId: task?.dealId ?? dealId ?? '',
    projectId: task?.projectId ?? projectId ?? '',
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const { data: deals } = useQuery({
    queryKey: ['deals', { status: 'OPEN' }],
    queryFn: () => dealsService.list({ status: 'OPEN' }),
  });
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => projectsService.list() });

  const mutation = useMutation({
    mutationFn: (data: TaskInput) => (task ? tasksService.update(task.id, data) : tasksService.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['contact'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      notify(task ? 'Tarea actualizada' : 'Tarea creada');
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
      priority: form.priority,
      status: form.status,
      dueDate: fromDateInput(form.dueDate),
      contactId: form.contactId || null,
      dealId: form.dealId || null,
      projectId: form.projectId || null,
    });
  };

  return (
    <Modal
      open={open}
      title={task ? 'Editar tarea' : 'Nueva tarea'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="task-form" loading={mutation.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Título" required error={errors.title}>
          {(id) => (
            <Input id={id} required value={form.title} onChange={(e) => set('title', e.target.value)} />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Prioridad" error={errors.priority}>
            {(id) => (
              <Select
                id={id}
                value={form.priority}
                onChange={(e) => set('priority', e.target.value as TaskPriority)}
              >
                {options(TASK_PRIORITY).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Estado" error={errors.status}>
            {(id) => (
              <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value as TaskStatus)}>
                {options(TASK_STATUS).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Vencimiento" error={errors.dueDate}>
            {(id) => (
              <Input id={id} type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Contacto">
            {(id) => <ContactSelect id={id} value={form.contactId} onChange={(v) => set('contactId', v)} />}
          </Field>
          <Field label="Oportunidad">
            {(id) => (
              <Select id={id} value={form.dealId} onChange={(e) => set('dealId', e.target.value)}>
                <option value="">Sin oportunidad</option>
                {deals?.items.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Proyecto">
            {(id) => (
              <Select id={id} value={form.projectId} onChange={(e) => set('projectId', e.target.value)}>
                <option value="">Sin proyecto</option>
                {projects?.items.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

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
