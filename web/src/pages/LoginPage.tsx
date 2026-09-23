import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Field, Input, Logo } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se ha podido iniciar sesión');
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
            <h1 className="text-lg font-bold tracking-tight">CRM <span className="text-brand-500">Personal</span></h1>
            <p className="text-sm text-slate-500">Accede a tu espacio privado</p>
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

          <Field label="Correo electrónico" required>
            {(id) => (
              <Input
                id={id}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            )}
          </Field>

          <Field label="Contraseña" required>
            {(id) => (
              <Input
                id={id}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            )}
          </Field>

          <Button type="submit" className="w-full" loading={loading}>
            Entrar
          </Button>

          <p className="text-center text-sm text-slate-500">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Crear cuenta
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
