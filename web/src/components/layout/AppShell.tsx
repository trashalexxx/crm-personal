import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { initials } from '../../lib/format';
import { dashboardService } from '../../services/insights.service';
import { Button } from '../ui';
import { Sidebar } from './Sidebar';

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const { notifyError } = useToast();
  const navigate = useNavigate();

  // El contador de tareas vencidas alimenta el aviso del menú lateral.
  const { data: summary } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.summary,
    staleTime: 60_000,
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      notifyError(error);
    }
  };

  return (
    <div className="min-h-full">
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        overdueTasks={summary?.tasks.overdue ?? 0}
      />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl dark:border-white/[0.07] dark:bg-slate-950/80 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06] lg:hidden"
            aria-label="Abrir menú"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex-1" />

          <button
            type="button"
            onClick={toggle}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-brand-400"
            aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M20 14.5A8.2 8.2 0 019.5 4a8.3 8.3 0 1010.5 10.5z" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenu((v) => !v)}
              className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              aria-haspopup="menu"
              aria-expanded={userMenu}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white ring-2 ring-brand-500/20">
                {initials(user?.name ?? '?')}
              </span>
              <span className="hidden text-sm font-medium sm:block">{user?.name}</span>
            </button>

            {userMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} aria-hidden />
                <div className="card absolute right-0 z-20 mt-2 w-56 animate-fade-in p-1.5" role="menu">
                  <div className="border-b border-slate-200 px-3 py-2 dark:border-white/[0.07]">
                    <p className="truncate text-sm font-medium">{user?.name}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenu(false);
                      navigate('/configuracion');
                    }}
                    className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                    role="menuitem"
                  >
                    Configuración
                  </button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-3 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                    onClick={handleLogout}
                  >
                    Cerrar sesión
                  </Button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
