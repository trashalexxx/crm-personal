import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  cx,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme, type Theme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../services/api';
import { authService } from '../services/auth.service';
import { dataService } from '../services/insights.service';
import { stagesService, tagsService } from '../services/settings.service';
import type { Stage, Tag } from '../types/models';

const COLORS = ['#d01228', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#63636c'];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex gap-1.5">
      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={`Color ${color}`}
          className={cx(
            'h-6 w-6 rounded-full transition-transform',
            value === color && 'ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-900',
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { notify, notifyError } = useToast();

  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    currency: user?.currency ?? 'EUR',
    locale: user?.locale ?? 'es-ES',
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [newTag, setNewTag] = useState({ name: '', color: COLORS[0] });
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);

  const [newStage, setNewStage] = useState({ name: '', probability: 50, color: COLORS[0] });
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [stageToDelete, setStageToDelete] = useState<Stage | null>(null);

  const { data: tags, isPending: tagsPending } = useQuery({ queryKey: ['tags'], queryFn: tagsService.list });
  const { data: stages, isPending: stagesPending } = useQuery({
    queryKey: ['stages'],
    queryFn: stagesService.list,
  });

  const saveProfile = useMutation({
    mutationFn: () => authService.updateProfile({ ...profile, theme }),
    onSuccess: (updated) => {
      setUser(updated);
      notify('Preferencias guardadas');
    },
    onError: notifyError,
  });

  const changePassword = useMutation({
    mutationFn: () =>
      authService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      }),
    onSuccess: () => {
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      notify('Contraseña actualizada');
    },
    onError: (error) => {
      setPasswordError(error instanceof ApiError ? error.message : 'No se pudo cambiar la contraseña');
    },
  });

  const tagMutation = useMutation({
    mutationFn: (tag: Tag | null) =>
      tag ? tagsService.update(tag.id, { name: tag.name, color: tag.color }) : tagsService.create(newTag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setNewTag({ name: '', color: COLORS[0] });
      setEditingTag(null);
      notify('Etiquetas actualizadas');
    },
    onError: notifyError,
  });

  const deleteTag = useMutation({
    mutationFn: (id: string) => tagsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      notify('Etiqueta eliminada');
      setTagToDelete(null);
    },
    onError: notifyError,
  });

  const stageMutation = useMutation({
    mutationFn: (stage: Stage | null) =>
      stage
        ? stagesService.update(stage.id, {
            name: stage.name,
            probability: stage.probability,
            color: stage.color,
          })
        : stagesService.create(newStage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      setNewStage({ name: '', probability: 50, color: COLORS[0] });
      setEditingStage(null);
      notify('Etapas actualizadas');
    },
    onError: notifyError,
  });

  const reorderStages = useMutation({
    mutationFn: (ids: string[]) => stagesService.reorder(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stages'] }),
    onError: notifyError,
  });

  const deleteStage = useMutation({
    mutationFn: (id: string) => stagesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      notify('Etapa eliminada');
      setStageToDelete(null);
    },
    onError: (error) => {
      notifyError(error);
      setStageToDelete(null);
    },
  });

  const moveStage = (index: number, direction: -1 | 1) => {
    if (!stages) return;
    const ids = stages.items.map((stage) => stage.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderStages.mutate(ids);
  };

  const submitPassword = (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    if (passwords.newPassword !== passwords.confirm) {
      setPasswordError('Las contraseñas nuevas no coinciden');
      return;
    }
    changePassword.mutate();
  };

  return (
    <>
      <PageHeader title="Configuración" subtitle="Preferencias, personalización y datos" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Perfil y preferencias">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveProfile.mutate();
            }}
          >
            <Field label="Nombre" required>
              {(id) => (
                <Input
                  id={id}
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              )}
            </Field>

            <Field label="Correo electrónico">
              {(id) => <Input id={id} value={user?.email ?? ''} disabled />}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Moneda" hint="Código ISO de 3 letras">
                {(id) => (
                  <Input
                    id={id}
                    maxLength={3}
                    value={profile.currency}
                    onChange={(e) => setProfile({ ...profile, currency: e.target.value.toUpperCase() })}
                  />
                )}
              </Field>
              <Field label="Formato regional">
                {(id) => (
                  <Select
                    id={id}
                    value={profile.locale}
                    onChange={(e) => setProfile({ ...profile, locale: e.target.value })}
                  >
                    <option value="es-ES">Español (España)</option>
                    <option value="es-MX">Español (México)</option>
                    <option value="es-AR">Español (Argentina)</option>
                    <option value="es-CO">Español (Colombia)</option>
                    <option value="en-US">English (US)</option>
                  </Select>
                )}
              </Field>
            </div>

            <Field label="Tema">
              {(id) => (
                <Select id={id} value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
                  <option value="system">Automático (según el sistema)</option>
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                </Select>
              )}
            </Field>

            <Button type="submit" loading={saveProfile.isPending}>
              Guardar preferencias
            </Button>
          </form>
        </Section>

        <Section title="Seguridad" description="Cambia tu contraseña de acceso">
          <form className="space-y-4" onSubmit={submitPassword}>
            {passwordError && (
              <p
                className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
                role="alert"
              >
                {passwordError}
              </p>
            )}
            <Field label="Contraseña actual" required>
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  required
                  autoComplete="current-password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                />
              )}
            </Field>
            <Field label="Nueva contraseña" required hint="Mínimo 10 caracteres, con letras y números">
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  required
                  autoComplete="new-password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                />
              )}
            </Field>
            <Field label="Repite la nueva contraseña" required>
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  required
                  autoComplete="new-password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                />
              )}
            </Field>
            <Button type="submit" loading={changePassword.isPending}>
              Cambiar contraseña
            </Button>
          </form>
        </Section>

        <Section title="Etiquetas" description="Clasifica tus contactos como prefieras">
          {tagsPending ? (
            <Spinner label="Cargando etiquetas…" />
          ) : (
            <>
              <ul className="mb-4 space-y-2">
                {tags?.items.map((tag) => (
                  <li key={tag.id} className="flex items-center gap-2">
                    {editingTag?.id === tag.id ? (
                      <>
                        <Input
                          className="flex-1"
                          value={editingTag.name}
                          onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                        />
                        <ColorPicker
                          value={editingTag.color}
                          onChange={(color) => setEditingTag({ ...editingTag, color })}
                        />
                        <Button size="sm" onClick={() => tagMutation.mutate(editingTag)}>
                          Guardar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingTag(null)}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {tag._count?.contacts ?? 0} contacto(s)
                        </span>
                        <div className="flex-1" />
                        <Button size="sm" variant="ghost" onClick={() => setEditingTag(tag)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-brand-600 dark:text-brand-400"
                          onClick={() => setTagToDelete(tag)}
                        >
                          Eliminar
                        </Button>
                      </>
                    )}
                  </li>
                ))}
                {tags?.items.length === 0 && (
                  <li className="text-sm text-slate-500">Todavía no tienes etiquetas.</li>
                )}
              </ul>

              <form
                className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800"
                onSubmit={(event) => {
                  event.preventDefault();
                  tagMutation.mutate(null);
                }}
              >
                <Field label="Nueva etiqueta" className="min-w-[160px] flex-1">
                  {(id) => (
                    <Input
                      id={id}
                      required
                      value={newTag.name}
                      onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                      placeholder="Prioritario, VIP…"
                    />
                  )}
                </Field>
                <div className="pb-2">
                  <ColorPicker value={newTag.color} onChange={(color) => setNewTag({ ...newTag, color })} />
                </div>
                <Button type="submit" loading={tagMutation.isPending}>
                  Añadir
                </Button>
              </form>
            </>
          )}
        </Section>

        <Section title="Etapas del pipeline" description="El orden define las columnas del tablero">
          {stagesPending ? (
            <Spinner label="Cargando etapas…" />
          ) : (
            <>
              <ul className="mb-4 space-y-2">
                {stages?.items.map((stage, index) => (
                  <li key={stage.id} className="flex flex-wrap items-center gap-2">
                    {editingStage?.id === stage.id ? (
                      <>
                        <Input
                          className="min-w-[140px] flex-1"
                          value={editingStage.name}
                          onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                        />
                        <Input
                          className="w-20"
                          type="number"
                          min={0}
                          max={100}
                          value={editingStage.probability}
                          onChange={(e) =>
                            setEditingStage({ ...editingStage, probability: Number(e.target.value) })
                          }
                          aria-label="Probabilidad"
                        />
                        <ColorPicker
                          value={editingStage.color}
                          onChange={(color) => setEditingStage({ ...editingStage, color })}
                        />
                        <Button size="sm" onClick={() => stageMutation.mutate(editingStage)}>
                          Guardar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingStage(null)}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="text-sm font-medium">{stage.name}</span>
                        <span className="text-xs text-slate-500">
                          {stage.probability}% · {stage._count?.deals ?? 0} op.
                        </span>
                        <div className="flex-1" />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveStage(index, -1)}
                          disabled={index === 0}
                          aria-label="Subir etapa"
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveStage(index, 1)}
                          disabled={index === (stages.items.length ?? 0) - 1}
                          aria-label="Bajar etapa"
                        >
                          ↓
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingStage(stage)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-brand-600 dark:text-brand-400"
                          onClick={() => setStageToDelete(stage)}
                        >
                          Eliminar
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              <form
                className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800"
                onSubmit={(event) => {
                  event.preventDefault();
                  stageMutation.mutate(null);
                }}
              >
                <Field label="Nueva etapa" className="min-w-[140px] flex-1">
                  {(id) => (
                    <Input
                      id={id}
                      required
                      value={newStage.name}
                      onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                      placeholder="Demostración…"
                    />
                  )}
                </Field>
                <Field label="Prob. %" className="w-24">
                  {(id) => (
                    <Input
                      id={id}
                      type="number"
                      min={0}
                      max={100}
                      value={newStage.probability}
                      onChange={(e) => setNewStage({ ...newStage, probability: Number(e.target.value) })}
                    />
                  )}
                </Field>
                <div className="pb-2">
                  <ColorPicker value={newStage.color} onChange={(color) => setNewStage({ ...newStage, color })} />
                </div>
                <Button type="submit" loading={stageMutation.isPending}>
                  Añadir
                </Button>
              </form>
            </>
          )}
        </Section>

        <Section
          title="Datos y copias de seguridad"
          description="Tus datos son tuyos: expórtalos cuando quieras"
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => dataService.exportContacts().catch(notifyError)}>
              Exportar contactos (CSV)
            </Button>
            <Button variant="secondary" onClick={() => dataService.downloadTemplate().catch(notifyError)}>
              Plantilla de importación
            </Button>
            <Button variant="secondary" onClick={() => dataService.downloadBackup().catch(notifyError)}>
              Copia de seguridad completa (JSON)
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            La copia de seguridad incluye contactos, etiquetas, etapas, oportunidades, tareas,
            interacciones, eventos, proyectos, presupuestos y documentos. Guárdala en un lugar
            seguro: contiene datos personales.
          </p>
        </Section>

        <Section
          title="Integraciones"
          description="Estado real de las conexiones externas"
        >
          <ul className="space-y-3 text-sm">
            {[
              {
                name: 'WhatsApp',
                detail:
                  'Disponible solo como enlace wa.me desde la ficha de contacto. No hay integración con la API de WhatsApp Business: la aplicación no envía mensajes ni registra conversaciones automáticamente.',
              },
              {
                name: 'Correo electrónico',
                detail:
                  'Disponible solo como enlace mailto:, que abre tu cliente de correo. No hay envío ni sincronización de bandeja de entrada.',
              },
              {
                name: 'Google Calendar',
                detail: 'No conectado. La agenda es interna y no se sincroniza con Google.',
              },
              {
                name: 'Automatizaciones de seguimiento',
                detail: 'No implementadas. No hay reglas ni tareas programadas en el servidor.',
              },
            ].map((item) => (
              <li key={item.name} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    No conectado
                  </span>
                </div>
                <p className="text-xs text-slate-500">{item.detail}</p>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <ConfirmDialog
        open={Boolean(tagToDelete)}
        title="Eliminar etiqueta"
        message={`Se quitará "${tagToDelete?.name ?? ''}" de todos los contactos que la tengan.`}
        loading={deleteTag.isPending}
        onCancel={() => setTagToDelete(null)}
        onConfirm={() => tagToDelete && deleteTag.mutate(tagToDelete.id)}
      />

      <ConfirmDialog
        open={Boolean(stageToDelete)}
        title="Eliminar etapa"
        message={`Se eliminará la etapa "${stageToDelete?.name ?? ''}". Solo es posible si no tiene oportunidades.`}
        loading={deleteStage.isPending}
        onCancel={() => setStageToDelete(null)}
        onConfirm={() => stageToDelete && deleteStage.mutate(stageToDelete.id)}
      />
    </>
  );
}
