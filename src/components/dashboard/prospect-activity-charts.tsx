'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  CartesianGrid,
  Dot,
} from 'recharts';
import { UserCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { nombreUsuario } from '@/lib/labels';

interface ProspectStat {
  userId: string;
  nombre: string | null;
  apellidos: string | null;
  email: string;
  totalProspectos: number;
  contactadosMes: number;
  conAlerta: number;
  convertidos: number;
}

interface DayData {
  fecha: string;
  dia: number;
  contactos: number;
}

interface TipificacionData {
  tipificacion: string;
  count: number;
}

interface Props {
  stats: ProspectStat[];
  porDia: DayData[];
  porTipificacion: TipificacionData[];
}

type Tab = 'agente' | 'dia' | 'tipificacion';

const TIPIFICACION_LABELS: Record<string, string> = {
  VENTA_REALIZADA:        '✅ Venta realizada',
  CLIENTE_INTERESADO:     '⭐ Cliente interesado',
  SEGUIMIENTO:            '🔄 Seguimiento',
  SIN_COBERTURA:          '📵 Sin cobertura',
  LLAMAR_MAS_TARDE:       '⏰ Llamar más tarde',
  CLIENTE_NO_INTERESADO:  '👎 No interesado',
  OTRO_PROVEEDOR:         '🔀 Otro proveedor',
  CLIENTE_MOLESTO:        '😡 Cliente molesto',
  LLAMADA:                '📞 Llamada',
  WHATSAPP:               '💬 WhatsApp',
  PYME:                   '🏢 PYME',
};

const PIE_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
  '#3b82f6', '#a855f7', '#14b8a6', '#f97316',
  '#ec4899', '#84cc16', '#06b6d4',
];

const TAB_LABELS: Record<Tab, string> = {
  agente:      'Por agente',
  dia:         'Por día',
  tipificacion: 'Por tipificación',
};

export function ProspectActivityCharts({ stats, porDia, porTipificacion }: Props) {
  const [tab, setTab] = useState<Tab>('agente');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const tooltipStyle = {
    fontSize: 12,
    borderRadius: 8,
    background: isDark ? '#0f172a' : '#ffffff',
    border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
    color: isDark ? '#f1f5f9' : '#0f172a',
  };

  const totalContactados = porDia.reduce((sum, d) => sum + d.contactos, 0);

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px',
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Por agente */}
      {tab === 'agente' && (
        <div className="space-y-2">
          {stats.map(stat => {
            const alertPct = stat.totalProspectos > 0 ? stat.conAlerta / stat.totalProspectos : 0;
            const rowBg = alertPct >= 0.6
              ? 'bg-red-50 dark:bg-red-950/20'
              : alertPct >= 0.3
              ? 'bg-yellow-50 dark:bg-yellow-950/20'
              : 'bg-muted/30';
            const contactPct = stat.totalProspectos > 0
              ? Math.round((stat.contactadosMes / stat.totalProspectos) * 100)
              : 0;
            return (
              <div key={stat.userId} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg', rowBg)}>
                <UserCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium w-32 truncate flex-shrink-0">
                  {nombreUsuario(stat)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      {stat.contactadosMes}/{stat.totalProspectos} este mes
                    </span>
                    <span className="text-xs font-medium">{contactPct}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${contactPct}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {stat.convertidos > 0 && (
                    <div className="flex items-center gap-1 text-xs text-green-600" title="Convertidos">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{stat.convertidos}</span>
                    </div>
                  )}
                  {stat.conAlerta > 0 && (
                    <div className="flex items-center gap-1 text-xs text-red-600" title="Con alerta">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{stat.conAlerta}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Por día */}
      {tab === 'dia' && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">
            {totalContactados} prospectos contactados este mes
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={porDia} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? '#1e293b' : '#e2e8f0'}
                vertical={false}
              />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value) => [value ?? 0, 'Contactados']}
                labelFormatter={(label) => `Día ${label}`}
                contentStyle={tooltipStyle}
              />
              <Line
                type="monotone"
                dataKey="contactos"
                stroke="#6366f1"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.contactos === 0) return <></>;
                  return <Dot cx={cx} cy={cy} r={3} fill="#6366f1" stroke="#6366f1" />;
                }}
                activeDot={{ r: 5, fill: '#6366f1' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Por tipificación */}
      {tab === 'tipificacion' && (
        <div>
          {porTipificacion.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sin datos de tipificación este mes
            </p>
          ) : (
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={porTipificacion}
                    dataKey="count"
                    nameKey="tipificacion"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {porTipificacion.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      value ?? 0,
                      TIPIFICACION_LABELS[String(name)] ?? String(name),
                    ]}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Leyenda manual */}
              <div className="space-y-1.5 min-w-[180px] w-full md:w-auto">
                {porTipificacion.map((d, i) => {
                  const total = porTipificacion.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                  return (
                    <div key={d.tipificacion} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="flex-1 truncate text-foreground">
                        {TIPIFICACION_LABELS[d.tipificacion] ?? d.tipificacion}
                      </span>
                      <span className="font-medium tabular-nums text-muted-foreground">
                        {d.count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
