import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { CONTACT_STATUS, options } from '../../lib/labels';
import { ApiError } from '../../services/api';
import { contactsService, type ContactInput } from '../../services/contacts.service';
import { tagsService } from '../../services/settings.service';
import type { Contact, ContactStatus } from '../../types/models';
import { Button, Field, Input, Modal, Select, Textarea, cx } from '../ui';

const EMPTY: ContactInput = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  position: '',
  website: '',
  linkedin: '',
  twitter: '',
  instagram: '',
  address: '',
  city: '',
  country: '',
  status: 'LEAD',
  source: '',
  notes: '',
  tagIds: [],
};

function toInput(contact: Contact): ContactInput {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    company: contact.company ?? '',
    position: contact.position ?? '',
    website: contact.website ?? '',
    linkedin: contact.linkedin ?? '',
    twitter: contact.twitter ?? '',
    instagram: contact.instagram ?? '',
    address: contact.address ?? '',
    city: contact.city ?? '',
    country: contact.country ?? '',
    status: contact.status,
    source: contact.source ?? '',
    notes: contact.notes ?? '',
    tagIds: contact.tags.map((t) => t.id),
  };
}

interface ContactFormProps {
  open: boolean;
  contact?: Contact | null;
  defaultStatus?: ContactStatus;
  onClose: () => void;
  onSaved?: (contact: Contact) => void;
}

export function ContactForm({ open, contact, defaultStatus, onClose, onSaved }: ContactFormProps) {
  const queryClient = useQueryClient();
  const { notify, notifyError } = useToast();
  const [form, setForm] = useState<ContactInput>(
    contact ? toInput(contact) : { ...EMPTY, status: defaultStatus ?? 'LEAD' },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: tagsData } = useQuery({ queryKey: ['tags'], queryFn: tagsService.list });

  const set = <K extends keyof ContactInput>(key: K, value: ContactInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const mutation = useMutation({
    mutationFn: (data: ContactInput) =>
      contact ? contactsService.update(contact.id, data) : contactsService.create(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', saved.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      notify(contact ? 'Contacto actualizado' : 'Contacto creado');
      onSaved?.(saved);
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) notifyError(error);
      } else {
        notifyError(error);
      }
    },
  });

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    mutation.mutate(form);
  };

  const toggleTag = (tagId: string) =>
    set(
      'tagIds',
      form.tagIds?.includes(tagId)
        ? form.tagIds.filter((id) => id !== tagId)
        : [...(form.tagIds ?? []), tagId],
    );

  return (
    <Modal
      open={open}
      title={contact ? 'Editar contacto' : 'Nuevo contacto'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" form="contact-form" loading={mutation.isPending}>
            {contact ? 'Guardar cambios' : 'Crear contacto'}
          </Button>
        </>
      }
    >
      <form id="contact-form" onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required error={errors.firstName}>
            {(id) => (
              <Input id={id} required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            )}
          </Field>
          <Field label="Apellidos" error={errors.lastName}>
            {(id) => <Input id={id} value={form.lastName ?? ''} onChange={(e) => set('lastName', e.target.value)} />}
          </Field>
          <Field label="Correo electrónico" error={errors.email}>
            {(id) => (
              <Input id={id} type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
            )}
          </Field>
          <Field label="Teléfono" error={errors.phone} hint="Incluye el prefijo internacional, p. ej. +34 600 000 000">
            {(id) => <Input id={id} value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />}
          </Field>
        </div>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Empresa
          </legend>
          <Field label="Empresa" error={errors.company}>
            {(id) => <Input id={id} value={form.company ?? ''} onChange={(e) => set('company', e.target.value)} />}
          </Field>
          <Field label="Cargo" error={errors.position}>
            {(id) => <Input id={id} value={form.position ?? ''} onChange={(e) => set('position', e.target.value)} />}
          </Field>
          <Field label="Estado" error={errors.status}>
            {(id) => (
              <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value as ContactStatus)}>
                {options(CONTACT_STATUS).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Origen" error={errors.source} hint="Cómo llegó a ti: referido, web, evento…">
            {(id) => <Input id={id} value={form.source ?? ''} onChange={(e) => set('source', e.target.value)} />}
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Redes y web
          </legend>
          <Field label="Sitio web" error={errors.website} hint="Debe empezar por https://">
            {(id) => (
              <Input
                id={id}
                type="url"
                placeholder="https://"
                value={form.website ?? ''}
                onChange={(e) => set('website', e.target.value)}
              />
            )}
          </Field>
          <Field label="LinkedIn" error={errors.linkedin}>
            {(id) => <Input id={id} value={form.linkedin ?? ''} onChange={(e) => set('linkedin', e.target.value)} />}
          </Field>
          <Field label="X / Twitter" error={errors.twitter}>
            {(id) => <Input id={id} value={form.twitter ?? ''} onChange={(e) => set('twitter', e.target.value)} />}
          </Field>
          <Field label="Instagram" error={errors.instagram}>
            {(id) => (
              <Input id={id} value={form.instagram ?? ''} onChange={(e) => set('instagram', e.target.value)} />
            )}
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Dirección
          </legend>
          <Field label="Dirección" error={errors.address} className="sm:col-span-3">
            {(id) => <Input id={id} value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />}
          </Field>
          <Field label="Ciudad" error={errors.city}>
            {(id) => <Input id={id} value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />}
          </Field>
          <Field label="País" error={errors.country}>
            {(id) => <Input id={id} value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} />}
          </Field>
        </fieldset>

        <div>
          <p className="label">Etiquetas</p>
          {tagsData?.items.length ? (
            <div className="flex flex-wrap gap-1.5">
              {tagsData.items.map((tag) => {
                const selected = form.tagIds?.includes(tag.id) ?? false;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    aria-pressed={selected}
                    className={cx(
                      'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      selected
                        ? 'border-transparent text-white'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                    )}
                    style={selected ? { backgroundColor: tag.color } : undefined}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Aún no hay etiquetas. Créalas en Configuración.
            </p>
          )}
        </div>

        <Field label="Notas" error={errors.notes}>
          {(id) => (
            <Textarea id={id} rows={3} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
          )}
        </Field>
      </form>
    </Modal>
  );
}
