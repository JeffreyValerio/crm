'use client';

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users } from 'lucide-react';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

interface TrendPoint {
  mes: string;
  registrados: number;
  instalaciones: number;
}

interface TrendsChartsProps {
  tendencia: TrendPoint[];
  comparativa: Array<{ mes: string; [vendedor: string]: number | string }>;
  vendedores: string[];
  year: string;
  role: string;
}

export function TrendsCharts({ tendencia, comparativa, vendedores, year, role }: TrendsChartsProps) {
  // Limitar a meses con datos para no mostrar meses futuros vacíos
  const currentMonth = new Date().getFullYear().toString() === year
    ? new Date().getMonth()
    : 11;
  const tendenciaVisible = tendencia.slice(0, currentMonth + 1);
  const comparativaVisible = comparativa.slice(0, currentMonth + 1);

  return (
    <div className="space-y-6">
      {/* Gráfico de tendencia: registros + instalaciones */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Tendencia mensual · {year}
          </CardTitle>
          <CardDescription>Clientes registrados vs instalaciones por mes</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={tendenciaVisible} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                labelFormatter={(label) => String(label)}
              />
              <Legend
                formatter={(value) => value === 'registrados' ? 'Registrados' : 'Instalaciones'}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone" dataKey="registrados"
                stroke="#6366f1" strokeWidth={2}
                dot={{ r: 3 }} activeDot={{ r: 5 }}
              />
              <Line
                type="monotone" dataKey="instalaciones"
                stroke="#22c55e" strokeWidth={2}
                dot={{ r: 3 }} activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico comparativa vendedores — solo admin con datos */}
      {role === 'admin' && vendedores.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Instalaciones por vendedor · {year}
            </CardTitle>
            <CardDescription>Comparativa mensual de instalaciones por agente</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={comparativaVisible} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {vendedores.map((v, i) => (
                  <Bar key={v} dataKey={v} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={32} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
