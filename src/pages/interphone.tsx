import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from 'lucide-react';

interface StatRow {
  userId: string;
  nombre: string;
  extension: string | null;
  respondido: number;
  perdidas: number;
  correoVoz: number;
  sinRespuesta: number;
  ocupado: number;
  alocSegundos: number | null;
  llamadasEntrantes: number;
  llamadasSalientes: number;
  sinDatos: boolean;
}

function fmtDuracion(seg: number | null): string {
  if (!seg || seg <= 0) return '—';
  const m = Math.floor(seg / 60);
  const s = Math.round(seg % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function InterphonePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StatRow[]>([]);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [displayFecha, setDisplayFecha] = useState('');

  const load = useCallback(async (f: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/interphone/stats?fecha=${f}`);
      if (res.status === 401) { router.push('/login'); return; }
      if (res.status === 403) { router.push('/'); return; }
      const data = await res.json();
      setRows(data.rows ?? []);
      setDisplayFecha(data.fecha ?? f);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(fecha); }, [fecha, load]);

  const totales = rows.reduce(
    (acc, r) => ({
      respondido: acc.respondido + r.respondido,
      perdidas: acc.perdidas + r.perdidas,
      salientes: acc.salientes + r.llamadasSalientes,
      entrantes: acc.entrantes + r.llamadasEntrantes,
    }),
    { respondido: 0, perdidas: 0, salientes: 0, entrantes: 0 },
  );

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Interphone</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Estadísticas de llamadas por extensión</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Fecha</label>
          <Input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Respondidas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{totales.respondido}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
              <PhoneMissed className="h-3.5 w-3.5 text-destructive" /> Perdidas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{totales.perdidas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
              <PhoneIncoming className="h-3.5 w-3.5 text-blue-500" /> Entrantes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{totales.entrantes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
              <PhoneOutgoing className="h-3.5 w-3.5 text-green-500" /> Salientes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{totales.salientes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      {loading ? (
        <TableSkeleton cols={8} rows={6} />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {rows.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Sin datos para esta fecha. Asigna extensiones a usuarios en Configuración.
              </p>
            ) : rows.map(r => (
              <div key={r.userId} className="rounded-lg border bg-card px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{r.nombre}</p>
                    <p className="text-xs text-muted-foreground font-mono">Ext. {r.extension}</p>
                  </div>
                  {r.sinDatos
                    ? <Badge variant="default">Sin datos</Badge>
                    : <Badge variant="success">{r.respondido} resp.</Badge>
                  }
                </div>
                {!r.sinDatos && (
                  <div className="grid grid-cols-3 gap-1 text-xs text-center">
                    <div className="rounded bg-muted/40 px-2 py-1">
                      <p className="text-muted-foreground">Perdidas</p>
                      <p className="font-semibold">{r.perdidas}</p>
                    </div>
                    <div className="rounded bg-muted/40 px-2 py-1">
                      <p className="text-muted-foreground">Entrantes</p>
                      <p className="font-semibold">{r.llamadasEntrantes}</p>
                    </div>
                    <div className="rounded bg-muted/40 px-2 py-1">
                      <p className="text-muted-foreground">Salientes</p>
                      <p className="font-semibold">{r.llamadasSalientes}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-center">Ext.</TableHead>
                    <TableHead className="text-center">Respondidas</TableHead>
                    <TableHead className="text-center">Perdidas</TableHead>
                    <TableHead className="text-center">Sin resp.</TableHead>
                    <TableHead className="text-center">Entrantes</TableHead>
                    <TableHead className="text-center">Salientes</TableHead>
                    <TableHead className="text-center">
                      <span className="flex items-center justify-center gap-1"><Clock className="h-3.5 w-3.5" /> Prom.</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableEmptyState colSpan={8} message="Sin datos. Asigna extensiones a usuarios en Configuración." />
                  ) : rows.map(r => (
                    <TableRow key={r.userId} className={r.sinDatos ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{r.nombre}</TableCell>
                      <TableCell className="text-center font-mono text-muted-foreground">{r.extension}</TableCell>
                      <TableCell className="text-center">
                        {r.sinDatos ? <span className="text-muted-foreground/50">—</span> : (
                          <span className={r.respondido > 0 ? 'font-semibold text-green-600 dark:text-green-400' : ''}>
                            {r.respondido}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.sinDatos ? <span className="text-muted-foreground/50">—</span> : (
                          <span className={r.perdidas > 0 ? 'text-destructive' : ''}>
                            {r.perdidas}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {r.sinDatos ? '—' : r.sinRespuesta}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {r.sinDatos ? '—' : r.llamadasEntrantes}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {r.sinDatos ? '—' : r.llamadasSalientes}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground text-xs font-mono">
                        {r.sinDatos ? '—' : fmtDuracion(r.alocSegundos)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && rows.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3 text-right">
          Datos del {displayFecha} · Solo usuarios con extensión asignada
        </p>
      )}
    </MainLayout>
  );
}
