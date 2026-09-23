import { NavLink } from 'react-router-dom';
import { Logo, cx } from '../ui';

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  badge?: number;
}

/** Iconos SVG inline: sin dependencias externas y heredan el color del texto. */
const ICONS: Record<string, JSX.Element> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  contacts: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5" strokeLinecap="round" />
      <path d="M16 4.5a3 3 0 010 6M18.5 20c-.2-1.7-.8-3-1.7-4" strokeLinecap="round" />
    </>
  ),
  clients: (
    <>
      <path d="M3 20V9l6-4 6 4v11" strokeLinejoin="round" />
      <path d="M15 20V11l6 3v6M9 20v-4h3v4" strokeLinejoin="round" />
    </>
  ),
  pipeline: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="9.5" y="4" width="5" height="11" rx="1.5" />
      <rect x="16" y="4" width="5" height="7" rx="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </>
  ),
  tasks: (
    <>
      <path d="M4 7l2 2 3.5-3.5M4 16l2 2 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 7.5h7M13 16.5h7" strokeLinecap="round" />
    </>
  ),
  activities: (
    <>
      <path d="M3 12h4l2.5-6 4 13 2.5-7h5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  projects: (
    <>
      <path d="M3 7.5A1.5 1.5 0 014.5 6h4l2 2.5h7A1.5 1.5 0 0119 10v7.5a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 013 17.5z" strokeLinejoin="round" />
    </>
  ),
  quotes: (
    <>
      <path d="M6 3h8l4 4v14H6z" strokeLinejoin="round" />
      <path d="M14 3v4h4M9 12h6M9 16h4" strokeLinecap="round" />
    </>
  ),
  reports: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" />
    </>
  ),
  documents: (
    <>
      <path d="M9.5 13.5l5-5M8 16l-1.5 1.5a3.5 3.5 0 01-5-5L4 11M16 13l1.5-1.5a3.5 3.5 0 00-5-5L11 8" strokeLinecap="round" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9L5.3 5.3" strokeLinecap="round" />
    </>
  ),
};

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/contactos', label: 'Contactos', icon: 'contacts' },
  { to: '/clientes', label: 'Clientes', icon: 'clients' },
  { to: '/pipeline', label: 'Pipeline', icon: 'pipeline' },
  { to: '/agenda', label: 'Agenda', icon: 'calendar' },
  { to: '/tareas', label: 'Tareas', icon: 'tasks' },
  { to: '/interacciones', label: 'Interacciones', icon: 'activities' },
  { to: '/proyectos', label: 'Proyectos', icon: 'projects' },
  { to: '/presupuestos', label: 'Presupuestos', icon: 'quotes' },
  { to: '/documentos', label: 'Documentos', icon: 'documents' },
  { to: '/reportes', label: 'Reportes', icon: 'reports' },
  { to: '/configuracion', label: 'Configuración', icon: 'settings' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  overdueTasks?: number;
}

export function Sidebar({ open, onClose, overdueTasks = 0 }: SidebarProps) {
  return (
    <>
      {/* Capa oscura solo en móvil, cuando el menú está desplegado. */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-white/[0.07] dark:bg-slate-950/95 dark:backdrop-blur-xl lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5 dark:border-white/[0.07]">
          <Logo />
          <span className="text-sm font-bold tracking-tight">
            CRM <span className="text-brand-500">Personal</span>
          </span>
        </div>

        <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cx(
                  'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-100',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="nav-active-bar" aria-hidden />}
                  <svg
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px] shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    aria-hidden
                  >
                    {ICONS[item.icon]}
                  </svg>
                  <span className="flex-1">{item.label}</span>
                  {item.to === '/tareas' && overdueTasks > 0 && (
                    <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {overdueTasks}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
