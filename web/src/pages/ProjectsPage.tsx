import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  ProgressBar,
  Select,
  Spinner,
  Textarea,
} from '../components/ui';
import { ContactSelect } from '../components/shared/ContactSelect';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate, fromDateInput, fullName, toDateInput } from '../lib/format';
import { PROJECT_STATUS, options } from '../lib/labels';
import { ApiError } from '../services/api';
import { projectsService, type ProjectInput } from '../services/projects.service';
import type { Project, ProjectStatus } from '../types/models';

function ProjectForm({
  open,
  project,
  onClose,
}: {
  open: boolean;
  project: Project | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { notify, notifyError } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: project?.name ?? '',
    description: project?.description ?? '',
    status: project?.status ?? ('PLANNED' as ProjectStatus),
    progress: project?.progress ?? 0,
    contactId: project?.contactId ?? '',
    startDate: toDateInput(project?.startDate),
    dueDate: toDateInput(project?.dueDate),
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const mutation = useMutation({
    mutationFn: (data: ProjectInput) =>
      project ? projectsService.update(project.id, data) : projectsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      notify(project ? 'Proyecto actualizado' : 'Proyecto creado');
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError) setErrors(error.fieldErrors);
      notifyError(error);
    },
  });

  return (
    <Modal
      open={open}
      title={project ? 'Editar proyecto' : 'Nuevo proyecto'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="project-form" loading={mutation.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form
        id="project-form"
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setErrors({});
          mutation.mutate({
            name: form.name,
            description: form.description,
            status: form.status,
            progress: Number(form.progress),
            contactId: form.contactId || null,
            startDate: fromDateInput(form.startDate),
            dueDate: fromDateInput(form.dueDate),
          });
        }}
      >
        <Field label="Nombre" required error={errors.name}>
          {(id) => <Input id={id} required value={form.name} onChange={(e) => set('name', e.target.value)} />}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Estado" error={errors.status}>
            {(id) => (
              <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value as ProjectStatus)}>
                {options(PROJECT_STATUS).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Cliente" error={errors.contactId}>
            {(id) => <ContactSelect id={id} value={form.contactId} onChange={(v) => set('contactId', v)} />}
          </Field>
          <Field label="Inicio" error={errors.startDate}>
            {(id) => (
              <Input id={id} type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
            )}
          </Field>
          <Field label="Entrega" error={errors.dueDate}>
            {(id) => (
              <Input id={id} type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            )}
          </Field>
        </div>

        <Field label={`Avance: ${form.progress}%`} error={errors.progress}>
          {(id) => (
            <input
              id={id}
              type="range"
              min={0}
              max={100}
              step={5}
              value={form.progress}
              onChange={(e) => set('progress', Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          )}
        </Field>

        <Field label="Descripción y entregables" error={errors.description}>
          {(id) => (
            <Textarea
              id={id}
              rows={4}
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify, notifyError } = useToast();
  const locale = user?.locale ?? 'es-ES';

  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [toDelete, setToDelete] = useState<Project | null>(null);

  const filters = { status: status || undefined };
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['projects', filters],
    queryFn: () => projectsService.list(filters),
  });

  const remove = useMutation({
    mutationFn: (id: string) => projectsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      notify('Proyecto eliminado');
      setToDelete(null);
    },
    onError: notifyError,
  });

  return (
    <>
      <PageHeader
        title="Proyectos"
        subtitle="Control de entregables y avance"
        actions={
          <>
            <Select
              className="w-44"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus | '')}
              aria-label="Filtrar por estado"
            >
              <option value="">Todos los estados</option>
              {(Object.keys(PROJECT_STATUS) as ProjectStatus[]).map((key) => (
                <option key={key} value={key}>
                  {PROJECT_STATUS[key].label}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Nuevo proyecto
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
            icon="📁"
            title="Sin proyectos"
            description="Crea un proyecto para seguir sus entregables y su avance."
            action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Nuevo proyecto
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((project) => (
            <article key={project.id} className="card flex flex-col p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold leading-snug">{project.name}</h2>
                <Badge className={PROJECT_STATUS[project.status].className}>
                  {PROJECT_STATUS[project.status].label}
                </Badge>
              </div>

              {project.contact && (
                <Link
                  to={`/contactos/${project.contact.id}`}
                  className="mb-2 text-xs text-brand-600 hover:underline dark:text-brand-400"
                >
                  {fullName(project.contact)}
                </Link>
              )}

              {project.description && (
                <p className="mb-3 line-clamp-3 text-xs text-slate-500">{project.description}</p>
              )}

              <div className="mt-auto space-y-2">
                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Avance</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <ProgressBar value={project.progress} />
                </div>

                <p className="text-xs text-slate-500">
                  {project.startDate ? formatDate(project.startDate, locale) : 'Sin inicio'} →{' '}
                  {project.dueDate ? formatDate(project.dueDate, locale) : 'sin fecha de entrega'}
                  {project._count ? ` · ${project._count.tasks} tarea(s)` : ''}
                </p>

                <div className="flex gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(project);
                      setFormOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-brand-600 dark:text-brand-400"
                    onClick={() => setToDelete(project)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {formOpen && (
        <ProjectForm
          open
          project={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar proyecto"
        message={`Se eliminará "${toDelete?.name ?? ''}". Las tareas asociadas quedarán sin proyecto.`}
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </>
  );
}
