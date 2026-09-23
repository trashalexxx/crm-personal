import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ContactSelect } from '../components/shared/ContactSelect';
import {
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
import { formatDate, fullName } from '../lib/format';
import { DOCUMENT_TYPE, options } from '../lib/labels';
import { ApiError } from '../services/api';
import { dealsService } from '../services/deals.service';
import { documentsService, type DocumentInput } from '../services/documents.service';
import { projectsService } from '../services/projects.service';
import type { DocumentLink, DocumentType } from '../types/models';

function DocumentForm({
  open,
  document,
  onClose,
}: {
  open: boolean;
  document: DocumentLink | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { notify, notifyError } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: document?.name ?? '',
    url: document?.url ?? '',
    description: document?.description ?? '',
    type: document?.type ?? ('OTHER' as DocumentType),
    contactId: document?.contactId ?? '',
    dealId: document?.dealId ?? '',
    projectId: document?.projectId ?? '',
  });

  const { data: deals } = useQuery({ queryKey: ['deals'], queryFn: () => dealsService.list() });
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => projectsService.list() });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const mutation = useMutation({
    mutationFn: (data: DocumentInput) =>
      document ? documentsService.update(document.id, data) : documentsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      notify(document ? 'Documento actualizado' : 'Documento añadido');
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
      title={document ? 'Editar documento' : 'Añadir documento'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="document-form" loading={mutation.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form
        id="document-form"
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setErrors({});
          mutation.mutate({
            name: form.name,
            url: form.url,
            description: form.description,
            type: form.type,
            contactId: form.contactId || null,
            dealId: form.dealId || null,
            projectId: form.projectId || null,
          });
        }}
      >
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/50">
          El CRM guarda <strong>enlaces</strong> a tus archivos (Drive, Dropbox, tu servidor…), no
          copias de los ficheros. Comprueba que el enlace tenga los permisos de acceso adecuados.
        </p>

        <Field label="Nombre" required error={errors.name}>
          {(id) => <Input id={id} required value={form.name} onChange={(e) => set('name', e.target.value)} />}
        </Field>

        <Field label="Enlace" required error={errors.url} hint="Debe empezar por https://">
          {(id) => (
            <Input
              id={id}
              type="url"
              required
              placeholder="https://"
              value={form.url}
              onChange={(e) => set('url', e.target.value)}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" error={errors.type}>
            {(id) => (
              <Select id={id} value={form.type} onChange={(e) => set('type', e.target.value as DocumentType)}>
                {options(DOCUMENT_TYPE).map((option) => (
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
          <Field label="Oportunidad" error={errors.dealId}>
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
          <Field label="Proyecto" error={errors.projectId}>
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

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify, notifyError } = useToast();
  const locale = user?.locale ?? 'es-ES';

  const [type, setType] = useState<DocumentType | ''>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentLink | null>(null);
  const [toDelete, setToDelete] = useState<DocumentLink | null>(null);

  const filters = { type: type || undefined };
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['documents', filters],
    queryFn: () => documentsService.list(filters),
  });

  const remove = useMutation({
    mutationFn: (id: string) => documentsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      notify('Documento eliminado');
      setToDelete(null);
    },
    onError: notifyError,
  });

  return (
    <>
      <PageHeader
        title="Documentos y archivos"
        subtitle="Enlaces a contratos, propuestas, facturas y materiales"
        actions={
          <>
            <Select
              className="w-44"
              value={type}
              onChange={(e) => setType(e.target.value as DocumentType | '')}
              aria-label="Filtrar por tipo"
            >
              <option value="">Todos los tipos</option>
              {(Object.keys(DOCUMENT_TYPE) as DocumentType[]).map((key) => (
                <option key={key} value={key}>
                  {DOCUMENT_TYPE[key].label}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Añadir documento
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
            icon="🔗"
            title="Sin documentos"
            description="Guarda aquí los enlaces a contratos, propuestas o facturas para tenerlos a mano."
            action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Añadir documento
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((doc) => (
            <article key={doc.id} className="card flex flex-col p-4">
              <div className="mb-1 flex items-start gap-2">
                <span aria-hidden>{DOCUMENT_TYPE[doc.type].icon}</span>
                <h2 className="flex-1 text-sm font-semibold leading-snug">{doc.name}</h2>
              </div>
              <p className="text-xs text-slate-500">
                {DOCUMENT_TYPE[doc.type].label} · {formatDate(doc.createdAt, locale)}
              </p>
              {doc.description && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{doc.description}</p>}

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                {doc.contact && <span>👤 {fullName(doc.contact)}</span>}
                {doc.deal && <span>💼 {doc.deal.title}</span>}
                {doc.project && <span>📁 {doc.project.name}</span>}
              </div>

              <div className="mt-auto flex items-center gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
                <a href={doc.url} target="_blank" rel="noreferrer noopener">
                  <Button size="sm" variant="secondary">
                    Abrir enlace
                  </Button>
                </a>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(doc);
                    setFormOpen(true);
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-brand-600 dark:text-brand-400"
                  onClick={() => setToDelete(doc)}
                >
                  Eliminar
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {formOpen && (
        <DocumentForm
          open
          document={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar documento"
        message={`Se eliminará el enlace "${toDelete?.name ?? ''}". El archivo original no se toca.`}
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </>
  );
}
