import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useDebounced } from '../../hooks/useDebounced';
import { fullName, initials } from '../../lib/format';
import { CONTACT_STATUS } from '../../lib/labels';
import { contactsService, type ContactFilters } from '../../services/contacts.service';
import { tagsService } from '../../services/settings.service';
import type { Contact, ContactStatus } from '../../types/models';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Spinner,
  cx,
} from '../ui';
import { ContactForm } from './ContactForm';

interface ContactsViewProps {
  /** Fija el estado y oculta el selector (se usa en la vista de Clientes). */
  lockedStatus?: ContactStatus;
  /** Filas de acciones adicionales sobre la tabla. */
  toolbarExtra?: React.ReactNode;
  onCreateRequested?: () => void;
  createSignal?: number;
}

export function ContactsView({ lockedStatus, toolbarExtra, createSignal }: ContactsViewProps) {
  const queryClient = useQueryClient();
  const { notify, notifyError } = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ContactStatus | ''>(lockedStatus ?? '');
  const [tagId, setTagId] = useState('');
  const [sort, setSort] = useState<'recent' | 'name' | 'company'>('recent');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Contact | null>(null);

  const debouncedSearch = useDebounced(search, 300);

  useEffect(() => {
    setStatus(lockedStatus ?? '');
  }, [lockedStatus]);

  // El padre puede pedir abrir el formulario incrementando createSignal.
  useEffect(() => {
    if (createSignal) {
      setEditing(null);
      setFormOpen(true);
    }
  }, [createSignal]);

  const filters: ContactFilters = {
    search: debouncedSearch || undefined,
    status: (status || undefined) as ContactStatus | undefined,
    tagId: tagId || undefined,
    sort,
  };

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['contacts', filters],
    queryFn: () => contactsService.list(filters),
  });
  const { data: tagsData } = useQuery({ queryKey: ['tags'], queryFn: tagsService.list });

  const remove = useMutation({
    mutationFn: (id: string) => contactsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      notify('Contacto eliminado');
      setToDelete(null);
    },
    onError: notifyError,
  });

  return (
    <>
      <div className="card mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4 4" strokeLinecap="round" />
          </svg>
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, empresa, teléfono o correo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar contactos"
          />
        </div>

        {!lockedStatus && (
          <Select
            className="sm:w-44"
            value={status}
            onChange={(e) => setStatus(e.target.value as ContactStatus | '')}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {(Object.keys(CONTACT_STATUS) as ContactStatus[]).map((key) => (
              <option key={key} value={key}>
                {CONTACT_STATUS[key].label}
              </option>
            ))}
          </Select>
        )}

        <Select
          className="sm:w-40"
          value={tagId}
          onChange={(e) => setTagId(e.target.value)}
          aria-label="Filtrar por etiqueta"
        >
          <option value="">Todas las etiquetas</option>
          {tagsData?.items.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </Select>

        <Select
          className="sm:w-40"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          aria-label="Ordenar"
        >
          <option value="recent">Más recientes</option>
          <option value="name">Por nombre</option>
          <option value="company">Por empresa</option>
        </Select>

        {toolbarExtra}
      </div>

      {isPending ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🗂️"
            title={debouncedSearch || status || tagId ? 'Sin resultados' : 'Todavía no hay contactos'}
            description={
              debouncedSearch || status || tagId
                ? 'Prueba a cambiar los filtros o el término de búsqueda.'
                : 'Crea tu primer contacto o importa tu lista desde un CSV.'
            }
            action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Nuevo contacto
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-500">
            {data.total} contacto{data.total === 1 ? '' : 's'}
          </p>

          {/* Tabla en pantallas grandes */}
          <div className="card hidden overflow-hidden lg:block">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Contacto</th>
                  <th className="px-4 py-2.5 font-medium">Empresa</th>
                  <th className="px-4 py-2.5 font-medium">Teléfono</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 font-medium">Etiquetas</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.items.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5">
                      <Link to={`/contactos/${contact.id}`} className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                          {initials(fullName(contact))}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{fullName(contact)}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {contact.email ?? '—'}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="block truncate">{contact.company ?? '—'}</span>
                      {contact.position && (
                        <span className="block truncate text-xs text-slate-500">{contact.position}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {contact.phone ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={CONTACT_STATUS[contact.status].className}>
                        {CONTACT_STATUS[contact.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {contact.tags.length > 3 && (
                          <span className="text-[11px] text-slate-400">+{contact.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(contact);
                            setFormOpen(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-brand-600 dark:text-brand-400"
                          onClick={() => setToDelete(contact)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas en móvil y tablet */}
          <div className="grid gap-2 lg:hidden">
            {data.items.map((contact) => (
              <Link
                key={contact.id}
                to={`/contactos/${contact.id}`}
                className="card-interactive flex items-center gap-3 p-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {initials(fullName(contact))}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{fullName(contact)}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[contact.company, contact.phone].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <Badge className={cx('shrink-0', CONTACT_STATUS[contact.status].className)}>
                  {CONTACT_STATUS[contact.status].label}
                </Badge>
              </Link>
            ))}
          </div>
        </>
      )}

      {formOpen && (
        <ContactForm
          open={formOpen}
          contact={editing}
          defaultStatus={lockedStatus}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminar contacto"
        message={`Se eliminará ${fullName(toDelete)} y su historial de interacciones. Esta acción no se puede deshacer.`}
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </>
  );
}
