import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState, ErrorState, PageHeader, Select, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatMoney } from '../lib/format';
import { CONTACT_STATUS, QUOTE_STATUS } from '../lib/labels';
import { reportsService } from '../services/insights.service';

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function ReportsPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [months, setMonths] = useState(6);
  const locale = user?.locale ?? 'es-ES';
  const currency = user?.currency ?? 'EUR';

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['reports', months],
    queryFn: () => reportsService.get(months),
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

  const monthLabel = (key: string) => {
    const [year, month] = key.split('-').map(Number);
    return new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(
      new Date(year, month - 1, 1),
    );
  };

  const revenueSeries = data.series.map((item) => ({
    month: monthLabel(item.month),
    ganado: item.wonAmountCents / 100,
    perdido: item.lostAmountCents / 100,
  }));

  const productivitySeries = data.series.map((item) => ({
    month: monthLabel(item.month),
    tareas: item.tasksCompleted,
    oportunidades: item.createdCount,
  }));

  const pipelineSeries = data.pipeline.map((stage) => ({
    ...stage,
    valor: stage.amountCents / 100,
  }));

  const hasClosedDeals = data.conversion.wonCount + data.conversion.lostCount > 0;
  const hasData =
    hasClosedDeals ||
    data.pipeline.some((stage) => stage.count > 0) ||
    data.productivity.created > 0;

  return (
    <>
      <PageHeader
        title="Reportes y estadísticas"
        subtitle="Calculado sobre tus datos reales, sin estimaciones"
        actions={
          <Select
            className="w-40"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            aria-label="Periodo"
          >
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Últimos 12 meses</option>
            <option value={24}>Últimos 24 meses</option>
          </Select>
        }
      />

      {!hasData ? (
        <div className="card">
          <EmptyState
            icon="📈"
            title="Todavía no hay suficientes datos"
            description="Cuando registres contactos, oportunidades y tareas, aquí verás tu conversión, tus ingresos y tu productividad."
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric
              label="Tasa de conversión"
              value={`${data.conversion.winRate}%`}
              hint={`${data.conversion.wonCount} ganadas / ${data.conversion.lostCount} perdidas`}
            />
            <Metric
              label="Ingresos ganados"
              value={formatMoney(data.conversion.wonAmountCents, currency, locale)}
              hint={`En los últimos ${months} meses`}
            />
            <Metric
              label="Venta media"
              value={formatMoney(data.conversion.averageWonCents, currency, locale)}
              hint="Importe medio de las ganadas"
            />
            <Metric
              label="Tareas completadas"
              value={`${data.productivity.completed}`}
              hint={`${data.productivity.pending} pendientes de ${data.productivity.created} creadas`}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="card p-4">
              <h2 className="mb-3 text-sm font-semibold">Ingresos por mes</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueSeries} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => formatMoney(Math.round(value * 100), currency, locale)}
                  />
                  <Bar dataKey="ganado" fill="#d01228" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="perdido" fill="#4a4a52" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section className="card p-4">
              <h2 className="mb-3 text-sm font-semibold">Productividad</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={productivitySeries} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="tareas" stroke="#ed2b40" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="oportunidades" stroke="#8a8a93" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </section>

            <section className="card p-4">
              <h2 className="mb-3 text-sm font-semibold">Pipeline abierto por etapa</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={pipelineSeries}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11, fill: axisColor }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, _name, item) => [
                      `${formatMoney(Math.round(value * 100), currency, locale)} · ${item.payload.count} op.`,
                      'Valor',
                    ]}
                  />
                  <Bar dataKey="valor" radius={[0, 5, 5, 0]}>
                    {pipelineSeries.map((entry) => (
                      <Cell key={entry.stageId} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section className="card p-4">
              <h2 className="mb-3 text-sm font-semibold">Distribución</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Contactos por estado
                  </h3>
                  <ul className="space-y-1.5">
                    {data.contactsByStatus.map((item) => (
                      <li key={item.status} className="flex items-center justify-between text-sm">
                        <span>{CONTACT_STATUS[item.status]?.label ?? item.status}</span>
                        <span className="font-semibold">{item.count}</span>
                      </li>
                    ))}
                    {data.contactsByStatus.length === 0 && (
                      <li className="text-sm text-slate-500">Sin contactos.</li>
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Presupuestos por estado
                  </h3>
                  <ul className="space-y-1.5">
                    {data.quotesByStatus.map((item) => (
                      <li key={item.status} className="flex items-center justify-between text-sm">
                        <span>{QUOTE_STATUS[item.status]?.label ?? item.status}</span>
                        <span className="font-semibold">{item.count}</span>
                      </li>
                    ))}
                    {data.quotesByStatus.length === 0 && (
                      <li className="text-sm text-slate-500">Sin presupuestos.</li>
                    )}
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
