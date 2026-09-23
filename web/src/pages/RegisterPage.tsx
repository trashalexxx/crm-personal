import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Field, Input, Logo } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (form.password !== form.confirm) {
      setFieldErrors({ confirm: 'Las contraseñas no coinciden' });
      return;
    }

    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else {
        setError('No se ha podido crear la cuenta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 dark:bg-slate-950">
      {/* Halo rojo de fondo, solo decorativo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[min(32rem,100vw)] -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl dark:bg-brand-600/25"
      />
      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="mb-6 flex items-center gap-3">
          <Logo size="lg" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">Crear cuenta</h1>
            <p className="text-sm text-slate-500">Tus datos quedan solo en tu instalación</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-6" noValidate>
          {error && (
            <p
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
              role="alert"
            >
              {error}
            </p>
          )}

          <Field label="Nombre" required error={fieldErrors.name}>
            {(id) => (
              <Input id={id} required value={form.name} onChange={update('name')} autoComplete="name" />
            )}
          </Field>

          <Field label="Correo electrónico" required error={fieldErrors.email}>
            {(id) => (
              <Input
                id={id}
                type="email"
                required
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
              />
            )}
          </Field>

          <Field
            label="Contraseña"
            required
            error={fieldErrors.password}
            hint="Mínimo 10 caracteres, con al menos una letra y un número"
          >
            {(id) => (
              <Input
                id={id}
                type="password"
                required
                value={form.password}
                onChange={update('password')}
                autoComplete="new-password"
              />
            )}
          </Field>

          <Field label="Repite la contraseña" required error={fieldErrors.confirm}>
            {(id) => (
              <Input
                id={id}
                type="password"
                required
                value={form.confirm}
                onChange={update('confirm')}
                autoComplete="new-password"
              />
            )}
          </Field>

          <Button type="submit" className="w-full" loading={loading}>
            Crear cuenta
          </Button>

          <p className="text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Iniciar sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
