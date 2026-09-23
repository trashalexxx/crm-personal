import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatDateTime, formatMoney, formatRelative, fullName, isOverdue } from '../lib/format';
import { ACTIVITY_TYPE, CONTACT_STATUS, EVENT_TYPE, TASK_PRIORITY } from '../lib/labels';
import { dashboardService } from '../services/insights.service';

function StatCard({
  label,
  value,
  hint,
  to,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  to: string;
  accent?: string;
}) {
  return (
    <Link to={to} className="card-interactive p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold tracking-tight ${accent ?? ''}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Link>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const currency = user?.currency ?? 'EUR';
  const locale = user?.locale ?? 'es-ES';

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.summary,
  });

  if (isPending) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    border: `1px solid ${gridColor}`,
    borderRadius: '0.5rem',
    fontSize: '12px',
    color: isDark ? '#e2e8f0' : '#0f172a',
  };

  const pipelineData = data.pipeline.map((stage) => ({
    ...stage,
    amount: stage.amountCents / 100,
  }));
  const hasPipelineValue = pipelineData.some((s) => s.count > 0);

  const contactData = [
    { name: CONTACT_STATUS.LEAD.label, value: data.contacts.lead, color: '#fb5f70' },
    { name: CONTACT_STATUS.ACTIVE.label, value: data.contacts.active, color: '#d01228' },
    { name: CONTACT_STATUS.RECURRING.label, value: data.contacts.recurring, color: '#8c1220' },
    { name: CONTACT_STATUS.INACTIVE.label, value: data.contacts.inactive, color: '#63636c' },
  ].filter((entry) => entry.value > 0);

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.name?.split(' ')[0] ?? ''}`}
        subtitle="Resumen de tu actividad comercial"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Contactos"
          value={String(data.contacts.total)}
          hint={`${data.contacts.active + data.contacts.recurring} clientes · ${data.contacts.lead} potenciales`}
          to="/contactos"
        />
        <StatCard
          label="Pipeline abierto"
          value={formatMoney(data.deals.openAmountCents, currency, locale)}
          hint={`${data.deals.openCount} oportunidad(es)`}
          to="/pipeline"
        />
        <StatCard
          label="Ganado este mes"
          value={formatMoney(data.deals.wonThisMonthAmountCents, currency, locale)}
          hint={`${data.deals.wonThisMonthCount} venta(s) cerrada(s)`}
          to="/reportes"
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Tareas pendientes"
          value={String(data.tasks.open)}
          hint={data.tasks.overdue > 0 ? `${data.tasks.overdue} vencida(s)` : 'Ninguna vencida'}
          to="/tareas"
          accent={data.tasks.overdue > 0 ? 'text-brand-600 dark:text-brand-400' : undefined}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Valor por etapa del pipeline</h2>
          {hasPipelineValue ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pipelineData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, _name, item) => [
                    `${formatMoney(Math.round(value * 100), currency, locale)} · ${item.payload.count} op.`,
                    'Valor',
                  ]}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {pipelineData.map((entry) => (
                    <Cell key={entry.stageId} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon="📊"
              title="Todavía no hay oportunidades"
              description="Crea tu primera oportunidad en el pipeline para ver aquí el valor por etapa."
            />
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Clientes por estado</h2>
          {contactData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={contactData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {contactData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="👥" title="Sin contactos" description="Añade contactos para ver su distribución." />
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Próximas tareas</h2>
            <Link to="/tareas" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              Ver todas
            </Link>
          </div>
          {data.upcomingTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No tienes tareas pendientes.</p>
          ) : (
            <ul className="space-y-2">
              {data.upcomingTasks.map((task) => (
                <li key={task.id} className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TASK_PRIORITY[task.priority].dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className={`text-xs ${isOverdue(task.dueDate) ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}>
                      {task.dueDate ? formatRelative(task.dueDate, locale) : 'Sin fecha'}
                      {task.contact && ` · ${fullName(task.contact)}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Agenda de los próximos 7 días</h2>
            <Link to="/agenda" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              Ver agenda
            </Link>
          </div>
          {data.upcomingEvents.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Sin eventos programados.</p>
          ) : (
            <ul className="space-y-2">
              {data.upcomingEvents.map((event) => (
                <li key={event.id} className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${EVENT_TYPE[event.type].className}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(event.startsAt, locale)}
                      {event.contact && ` · ${fullName(event.contact)}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Últimas interacciones</h2>
            <Link to="/interacciones" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              Ver historial
            </Link>
          </div>
          {data.recentActivities.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Aún no has registrado interacciones.</p>
          ) : (
            <ul className="space-y-2">
              {data.recentActivities.slice(0, 6).map((activity) => (
                <li key={activity.id} className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <span className="text-sm" aria-hidden>
                    {ACTIVITY_TYPE[activity.type].icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{activity.subject}</p>
                    <p className="text-xs text-slate-500">
                      {formatRelative(activity.occurredAt, locale)}
                      {activity.contact && ` · ${fullName(activity.contact)}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {data.quotes.pending > 0 || data.projects.active > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.projects.active > 0 && (
            <Link to="/proyectos">
              <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                {data.projects.active} proyecto(s) en curso
              </Badge>
            </Link>
          )}
          {data.quotes.pending > 0 && (
            <Link to="/presupuestos">
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                {data.quotes.pending} presupuesto(s) sin resolver
              </Badge>
            </Link>
          )}
        </div>
      ) : null}
    </>
  );
}
