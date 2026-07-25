import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

interface StatRow {
  userId: string;
  nombre: string;
  extension: string | null;
  respondido: number;
  perdidas: number;
  correoVoz: number;
  sinRespuesta: number;
  ocupado: number;
  llamadasEntrantes: number;
  duracionInboundSeg: number;
  llamadasSalientes: number;
  duracionSalidaSeg: number;
  tipificadasLlamada: number;
  sinDatos: boolean;
}

interface VendorOption { id: string; nombre: string; extension: string | null; }

interface CdrRow {
  id: string;
  extension: string;
  direccion: string;
  cidNumero: string;
  destino: string;
  fecha: string;
  duracion: string;
  estado: string;
  causaColgar: string | null;
}

interface VinculoInfo {
  tipo: 'prospecto' | 'cliente';
  id: string;
  nombre: string;
  nroOrden?: string;
}

function fmtDuracion(seg: number | null | undefined): string {
  if (!seg || seg <= 0) return '—';
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = Math.round(seg % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function InterphonePage() {
  const router = useRouter();
  const [tab, setTab]             = useState<'stats' | 'cdr'>('stats');
  const [loading, setLoading]     = useState(true);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [rows, setRows]           = useState<StatRow[]>([]);
  const [periodo, setPeriodo]     = useState('');
  const [vendors, setVendors]     = useState<VendorOption[]>([]);

  // ── CDR state ──
  const [cdrRows, setCdrRows]       = useState<CdrRow[]>([]);
  const [cdrLoading, setCdrLoading] = useState(false);
  const [cdrSearch, setCdrSearch]   = useState('');
  const [cdrMes, setCdrMes]         = useState(() => new Date(Date.now() - 6 * 60 * 60 * 1000).getUTCMonth() + 1);
  const [cdrAnio, setCdrAnio]       = useState(() => new Date(Date.now() - 6 * 60 * 60 * 1000).getUTCFullYear());
  const [cdrPage, setCdrPage]       = useState(1);
  const [cdrTotalPages, setCdrTotalPages] = useState(1);
  const [cdrTotal, setCdrTotal]     = useState(0);
  const [vinculosMap, setVinculosMap] = useState<Record<string, VinculoInfo>>({});

  // Filters
  const [modo, setModo]           = useState<'dia' | 'mes'>('dia');
  const [fecha, setFecha]         = useState(() => {
    const now = new Date();
    const cr = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    return cr.toISOString().slice(0, 10);
  });
  const [year, setYear]           = useState(() => {
    const cr = new Date(Date.now() - 6 * 60 * 60 * 1000);
    return cr.getUTCFullYear();
  });
  const [mes, setMes]             = useState(() => {
    const cr = new Date(Date.now() - 6 * 60 * 60 * 1000);
    return cr.getUTCMonth() + 1;
  });
  const [filterVendor, setFilterVendor] = useState('');

  const buildUrl = useCallback(() => {
    const p = new URLSearchParams({ modo });
    if (modo === 'dia') {
      p.set('fecha', fecha);
    } else {
      p.set('year', String(year));
      p.set('mes', String(mes));
    }
    if (filterVendor) p.set('vendorId', filterVendor);
    return `/api/interphone/stats?${p}`;
  }, [modo, fecha, year, mes, filterVendor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(buildUrl());
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setRows(data.rows ?? []);
      setPeriodo(data.periodo ?? '');
      setIsAdmin(data.isAdmin ?? false);
    } finally {
      setLoading(false);
    }
  }, [buildUrl, router]);

  // Load vendors list (admin only, users with extension)
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(({ user }) => {
      if (!user) { router.push('/login'); return; }
      if (user.role === 'admin') {
        fetch('/api/users').then(r => r.json()).then(({ users }) => {
          setVendors(
            (users ?? [])
              .filter((u: VendorOption & { extension: string | null }) => u.extension)
              .map((u: VendorOption & { nombre: string | null; apellidos: string | null; email: string }) => ({
                id: u.id,
                extension: u.extension,
                nombre: u.nombre && (u as { apellidos?: string | null }).apellidos
                  ? `${u.nombre} ${(u as { apellidos?: string | null }).apellidos}`
                  : u.email,
              }))
              .sort((a: VendorOption, b: VendorOption) => a.nombre.localeCompare(b.nombre))
          );
        });
      }
    });
  }, [router]);

  const loadCdr = useCallback(async (page = 1, mes = cdrMes, anio = cdrAnio, search = cdrSearch) => {
    setCdrLoading(true);
    setVinculosMap({});
    try {
      const desde = new Date(Date.UTC(anio, mes - 1, 1)).toISOString();
      const hasta  = new Date(Date.UTC(anio, mes, 1)).toISOString();
      const p = new URLSearchParams({ page: String(page), limit: '50', desde, hasta });
      if (search.trim()) p.set('search', search.trim());
      const res = await fetch(`/api/interphone/cdr?${p}`);
      if (!res.ok) return;
      const data = await res.json();
      const registros: CdrRow[] = data.registros ?? [];
      setCdrRows(registros);
      setCdrPage(data.pagination?.page ?? 1);
      setCdrTotalPages(data.pagination?.totalPages ?? 1);
      setCdrTotal(data.pagination?.total ?? 0);

      const numeros = [...new Set(registros.map(r => r.destino))].filter(Boolean);
      if (numeros.length > 0) {
        fetch('/api/interphone/lookup-phones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ numeros }),
        }).then(r => r.ok ? r.json() : {}).then(setVinculosMap).catch(() => {});
      }
    } finally {
      setCdrLoading(false);
    }
  }, [cdrMes, cdrAnio, cdrSearch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'cdr') loadCdr(1); }, [tab, loadCdr]);

  const totales = rows.reduce(
    (acc, r) => ({
      respondido:         acc.respondido         + r.respondido,
      perdidas:           acc.perdidas           + r.perdidas,
      salientes:          acc.salientes          + r.llamadasSalientes,
      entrantes:          acc.entrantes          + r.llamadasEntrantes,
      tipificadasLlamada: acc.tipificadasLlamada + r.tipificadasLlamada,
    }),
    { respondido: 0, perdidas: 0, salientes: 0, entrantes: 0, tipificadasLlamada: 0 },
  );

  const yearOptions = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Interphone</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {tab === 'stats' ? 'Estadísticas de llamadas por extensión' : 'Registro detallado de llamadas (CDR)'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-5">
        <nav className="-mb-px flex gap-6">
          {([['stats', 'Estadísticas'], ['cdr', 'Registro CDR']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors',
                tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {key === 'stats' ? <Phone className="h-4 w-4" /> : <PhoneIncoming className="h-4 w-4" />}
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Registro CDR ─────────────────────────────────────────────── */}
      {tab === 'cdr' && (
        <div className="space-y-4">
          {/* Filtros CDR */}
          <div className="flex flex-wrap gap-2">
            <Select
              value={String(cdrMes)}
              onChange={e => setCdrMes(Number(e.target.value))}
              className="w-36"
            >
              {MESES.map((label, i) => (
                <option key={i} value={i + 1}>{label}</option>
              ))}
            </Select>
            <Select
              value={String(cdrAnio)}
              onChange={e => setCdrAnio(Number(e.target.value))}
              className="w-24"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar número, extensión..."
                value={cdrSearch}
                onChange={e => setCdrSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') loadCdr(1, cdrMes, cdrAnio, cdrSearch); }}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={() => loadCdr(1, cdrMes, cdrAnio, cdrSearch)}>Buscar</Button>
          </div>

          <p className="text-sm text-muted-foreground">{cdrTotal} llamada{cdrTotal !== 1 ? 's' : ''}</p>

          {cdrLoading ? (
            <TableSkeleton cols={7} rows={10} />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Extensión</TableHead>
                      <TableHead>Número CID</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead className="text-center">Fecha / Hora</TableHead>
                      <TableHead className="text-center">Duración</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cdrRows.length === 0 ? (
                      <TableEmptyState colSpan={7} message="Sin registros para este filtro" />
                    ) : cdrRows.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="text-center">
                          {r.direccion === 'Salida'
                            ? <PhoneOutgoing className="h-3.5 w-3.5 text-green-500 inline" />
                            : r.direccion === 'Entrada'
                            ? <PhoneIncoming className="h-3.5 w-3.5 text-blue-500 inline" />
                            : <Phone className="h-3.5 w-3.5 text-muted-foreground inline" />}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{r.extension}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{r.cidNumero}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-sm font-medium">{r.destino}</span>
                            {vinculosMap[r.destino.replace(/\D/g, '')] && (
                              <button
                                onClick={() => {
                                  const v = vinculosMap[r.destino.replace(/\D/g, '')];
                                  router.push(v.tipo === 'cliente' ? `/clients/${v.id}` : '/prospects');
                                }}
                                className="flex items-center gap-1 text-left group w-fit"
                              >
                                <Badge
                                  variant={vinculosMap[r.destino.replace(/\D/g, '')].tipo === 'cliente' ? 'success' : 'info'}
                                  className="text-[10px] py-0 px-1.5"
                                >
                                  {vinculosMap[r.destino.replace(/\D/g, '')].tipo === 'cliente' ? 'Cliente' : 'Prospecto'}
                                </Badge>
                                <span className="text-xs text-primary group-hover:underline truncate max-w-[130px]">
                                  {vinculosMap[r.destino.replace(/\D/g, '')].nombre}
                                </span>
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(r.fecha).toLocaleString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">{r.duracion}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              r.estado === 'Respondido' ? 'success'
                              : r.estado === 'Cancelado' ? 'warning'
                              : 'destructive'
                            }
                          >
                            {r.estado}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {cdrTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Página {cdrPage} de {cdrTotalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={cdrPage === 1} onClick={() => loadCdr(cdrPage - 1, cdrMes, cdrAnio, cdrSearch)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={cdrPage === cdrTotalPages} onClick={() => loadCdr(cdrPage + 1, cdrMes, cdrAnio, cdrSearch)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Estadísticas ─────────────────────────────────────────────── */}
      {tab === 'stats' && <>
        {/* Modo toggle */}
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5 text-sm mb-5 w-fit">
          {(['dia', 'mes'] as const).map(m => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={cn(
                'px-3 py-1.5 rounded-md font-medium transition-colors',
                modo === m
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {m === 'dia' ? 'Por día' : 'Por mes'}
            </button>
          ))}
        </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-5">
        {modo === 'dia' ? (
          <Input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="w-40"
          />
        ) : (
          <>
            <Select
              value={String(mes)}
              onChange={e => setMes(Number(e.target.value))}
              className="w-36"
            >
              {MESES.map((label, i) => (
                <option key={i} value={i + 1}>{label}</option>
              ))}
            </Select>
            <Select
              value={String(year)}
              onChange={e => setYear(Number(e.target.value))}
              className="w-24"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
          </>
        )}

        {isAdmin && vendors.length > 0 && (
          <Select
            value={filterVendor}
            onChange={e => setFilterVendor(e.target.value)}
            className="w-52"
          >
            <option value="">Todos los vendedores</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>
                {v.nombre} (ext. {v.extension})
              </option>
            ))}
          </Select>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
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
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-blue-500" /> CRM llamadas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{totales.tipificadasLlamada}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      {loading ? (
        <TableSkeleton cols={9} rows={6} />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {rows.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Sin datos para este período.
              </p>
            ) : rows.map(r => (
              <div key={r.userId} className="rounded-lg border bg-card px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{r.nombre}</p>
                    <p className="text-xs text-muted-foreground font-mono">Ext. {r.extension}</p>
                  </div>
                  <p className={cn('text-lg font-bold', r.respondido > 0 ? 'text-green-500' : 'text-muted-foreground')}>
                    {r.respondido}
                  </p>
                </div>
                {!r.sinDatos && (
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="rounded bg-muted/40 px-2 py-1">
                      <p className="text-muted-foreground">Perdidas</p>
                      <p className="font-semibold text-destructive">{r.perdidas}</p>
                    </div>
                    <div className="rounded bg-muted/40 px-2 py-1">
                      <p className="text-muted-foreground">Salientes</p>
                      <p className="font-semibold">{r.llamadasSalientes}</p>
                    </div>
                    <div className="rounded bg-muted/40 px-2 py-1">
                      <p className="text-muted-foreground">Dur. entrada</p>
                      <p className="font-semibold font-mono">{fmtDuracion(r.duracionInboundSeg)}</p>
                    </div>
                    <div className="rounded bg-muted/40 px-2 py-1">
                      <p className="text-muted-foreground">Dur. salida</p>
                      <p className="font-semibold font-mono">{fmtDuracion(r.duracionSalidaSeg)}</p>
                    </div>
                    <div className="rounded bg-muted/40 px-2 py-1 col-span-2">
                      <p className="text-muted-foreground">CRM llamadas tipificadas</p>
                      <p className="font-semibold text-blue-500">{r.tipificadasLlamada}</p>
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
                    <TableHead className="text-center">
                      <span className="flex items-center justify-center gap-1"><Clock className="h-3.5 w-3.5" /> Dur. entrada</span>
                    </TableHead>
                    <TableHead className="text-center">Salientes</TableHead>
                    <TableHead className="text-center">
                      <span className="flex items-center justify-center gap-1"><Clock className="h-3.5 w-3.5" /> Dur. salida</span>
                    </TableHead>
                    <TableHead className="text-center">CRM llamadas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableEmptyState colSpan={10} message="Sin datos para este período." />
                  ) : rows.map(r => (
                    <TableRow key={r.userId} className={r.sinDatos ? 'opacity-40' : ''}>
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
                          <span className={r.perdidas > 0 ? 'text-destructive' : ''}>{r.perdidas}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {r.sinDatos ? '—' : r.sinRespuesta}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {r.sinDatos ? '—' : r.llamadasEntrantes}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground text-xs font-mono">
                        {r.sinDatos ? '—' : fmtDuracion(r.duracionInboundSeg)}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {r.sinDatos ? '—' : r.llamadasSalientes}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground text-xs font-mono">
                        {r.sinDatos ? '—' : fmtDuracion(r.duracionSalidaSeg)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={r.tipificadasLlamada > 0 ? 'font-semibold text-blue-500 dark:text-blue-400' : 'text-muted-foreground'}>
                          {r.tipificadasLlamada}
                        </span>
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
          {modo === 'dia' ? `Datos del ${periodo}` : `${MESES[mes - 1]} ${year}`}
          {isAdmin && ' · Solo usuarios con extensión asignada'}
        </p>
      )}
      </>}
    </MainLayout>
  );
}
