import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { MainLayout } from '@/components/layout/main-layout';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ArrowRight, Clock, CheckCircle2, AlertCircle, XCircle, DollarSign, Ban, Target, TrendingUp, UserCircle, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const TrendsCharts = dynamic(
  () => import('@/components/dashboard/trends-charts').then(m => m.TrendsCharts),
  { ssr: false, loading: () => <div className="h-[560px] animate-pulse rounded-lg bg-muted/40" /> }
);

const ProspectActivityCharts = dynamic(
  () => import('@/components/dashboard/prospect-activity-charts').then(m => m.ProspectActivityCharts),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted/40" /> }
);

interface ClientStats {
  validationStatus: string | null;
  saleStatus: string | null;
  count: number;
}

interface User {
  id: string;
  email: string;
  nombre?: string | null;
  apellidos?: string | null;
}

interface ComplianceStats {
  userId: string;
  email: string;
  nombre?: string | null;
  apellidos?: string | null;
  installed: number;
  pending: number;
  target: number;
  percentage: number;
}

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


export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string; role?: string; nombre?: string; apellidos?: string } | null>(null);
  const [stats, setStats] = useState<ClientStats[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [complianceStats, setComplianceStats] = useState<ComplianceStats[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [effectivenessData, setEffectivenessData] = useState<{
    totalContacts: number;
    installed: number;
    effectiveness: number;
  } | null>(null);
  const hasMounted = useRef(false);
  const [kpiMeta, setKpiMeta] = useState<number>(8);
  const [editingMeta, setEditingMeta] = useState(false);
  const [editMetaValue, setEditMetaValue] = useState<string>('8');
  const [savingMeta, setSavingMeta] = useState(false);
  const [trendsData, setTrendsData] = useState<{
    tendencia: Array<{ mes: string; registrados: number; instalaciones: number }>;
    comparativa: Array<{ mes: string; [k: string]: number | string }>;
    vendedores: string[];
  } | null>(null);
  const [prospectStats, setProspectStats] = useState<ProspectStat[]>([]);
  const [myProspectStat, setMyProspectStat] = useState<ProspectStat | null>(null);
  const [prospectActivity, setProspectActivity] = useState<{
    porDia: Array<{ fecha: string; dia: number; contactos: number }>;
    porTipificacion: Array<{ tipificacion: string; count: number }>;
  }>({ porDia: [], porTipificacion: [] });

  // Función auxiliar para formatear el período seleccionado
  function getPeriodLabel(): string {
    if (filterMonth && filterYear) {
      return new Date(parseInt(filterYear), parseInt(filterMonth) - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    } else if (filterYear) {
      return filterYear;
    }
    return 'Mes actual';
  }

  useEffect(() => {
    async function checkAuth() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
      } else {
        const data = await response.json();
        setUser(data.user);
        setCurrentUserId(data.user?.userId || null);

        if (data.user?.role === 'admin') {
          if (router.query.createdBy) {
            setFilterCreatedBy(router.query.createdBy as string);
          }
          await loadUsers();
        }

        await loadDashboardData(data.user);
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  async function loadUsers() {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users?.map((u: { id: string; email: string; nombre?: string; apellidos?: string }) => ({
          id: u.id,
          email: u.email,
          nombre: u.nombre,
          apellidos: u.apellidos,
        })) || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  async function loadDashboardData(
    userOverride?: { role?: string; email?: string; nombre?: string; apellidos?: string } | null,
    yearOverride?: string,
    monthOverride?: string,
  ) {
    const activeUser = userOverride ?? user;
    if (!activeUser) return;

    const year = yearOverride ?? filterYear;
    const month = monthOverride ?? filterMonth;

    try {
      const params = new URLSearchParams();
      if (year) params.append('year', year);
      if (month) params.append('month', month);
      if (activeUser.role === 'admin' && filterCreatedBy) params.append('createdBy', filterCreatedBy);

      const trendsParams = new URLSearchParams();
      if (year) trendsParams.append('year', year);
      if (activeUser.role === 'admin' && filterCreatedBy) trendsParams.append('createdBy', filterCreatedBy);

      const [statsRes, prospectsRes, trendsRes, activityRes] = await Promise.all([
        fetch(`/api/dashboard/stats?${params.toString()}`),
        fetch(`/api/prospects/stats?year=${year}&month=${month}${filterCreatedBy ? `&asignadoA=${filterCreatedBy}` : ''}`),
        fetch(`/api/dashboard/trends?${trendsParams.toString()}`),
        fetch(`/api/prospects/activity?year=${year}&month=${month}${filterCreatedBy ? `&asignadoA=${filterCreatedBy}` : ''}`),
      ]);

      // ── Stats de clientes ─────────────────────────────────
      if (statsRes.ok) {
        const data = await statsRes.json();

        setTotalClients(data.totalClients ?? 0);
        setStats(data.statsParEstado ?? []);
        setKpiMeta(data.meta ?? 8);
        setEffectivenessData({
          totalContacts: data.totalClients ?? 0,
          installed: data.instalaciones ?? 0,
          effectiveness: data.efectividad ?? 0,
        });

        const compStats: ComplianceStats[] = data.cumplimiento ?? [];
        if (activeUser.role !== 'admin' && currentUserId) {
          const mine = compStats.find((s: ComplianceStats) => s.userId === currentUserId);
          setComplianceStats(mine ? [mine] : [{
            userId: currentUserId,
            email: activeUser.email || '',
            nombre: activeUser.nombre || null,
            apellidos: activeUser.apellidos || null,
            installed: 0,
            pending: 0,
            target: kpiMeta,
            percentage: 0,
          }]);
        } else {
          setComplianceStats(compStats);
        }
      } else {
        // Fallback: mostrar métricas vacías si el API falla
        console.error('Dashboard stats error:', statsRes.status, await statsRes.text().catch(() => ''));
        setEffectivenessData({ totalContacts: 0, installed: 0, effectiveness: 0 });
      }

      // ── Prospectos ────────────────────────────────────────
      if (prospectsRes.ok) {
        const prospectsData = await prospectsRes.json();
        const statsArr: ProspectStat[] = prospectsData.stats || [];
        if (activeUser.role === 'admin') {
          setProspectStats(statsArr);
        } else {
          setMyProspectStat(statsArr[0] || null);
        }
      }

      // ── Tendencias ────────────────────────────────────────
      if (trendsRes.ok) {
        const trendsData = await trendsRes.json();
        setTrendsData(trendsData);
      }

      // ── Actividad de prospectos ───────────────────────────
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setProspectActivity({
          porDia: activityData.porDia ?? [],
          porTipificacion: activityData.porTipificacion ?? [],
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  // Recargar cuando cambien los filtros — pasar valores explícitamente para evitar stale closure
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (user) loadDashboardData(null, filterYear, filterMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCreatedBy, filterYear, filterMonth]);

  async function saveMeta() {
    const value = parseInt(editMetaValue);
    if (!filterMonth || !filterYear || isNaN(value) || value < 1) return;
    setSavingMeta(true);
    try {
      const periodo = `${filterYear}-${filterMonth.padStart(2, '0')}`;
      const res = await fetch('/api/kpi-meta', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo, meta: value }),
      });
      if (!res.ok) throw new Error();
      setEditingMeta(false);
      toast.success('Meta actualizada');
      loadDashboardData(null, filterYear, filterMonth);
    } catch {
      toast.error('Error al guardar la meta');
    } finally {
      setSavingMeta(false);
    }
  }

  function getStatusInfo(status: string | null, saleStatus: string | null) {
    // Priorizar estado de venta si existe
    if (saleStatus === 'INSTALADA') {
      return {
        label: 'Instalado',
        color: 'bg-green-500',
        textColor: 'text-foreground',
        borderColor: 'border-green-500',
        icon: CheckCircle2,
      };
    }
    
    if (saleStatus === 'PENDIENTE_INSTALACION') {
      return {
        label: 'Pendiente Instalación',
        color: 'bg-blue-500',
        textColor: 'text-foreground',
        borderColor: 'border-blue-500',
        icon: Clock,
      };
    }

    if (saleStatus === 'CANCELADA') {
      return {
        label: 'Cancelada',
        color: 'bg-gray-500',
        textColor: 'text-foreground',
        borderColor: 'border-gray-500',
        icon: XCircle,
      };
    }

    if (saleStatus === 'NO_COMPLETO_FACEID') {
      return {
        label: 'No completó FaceID',
        color: 'bg-amber-500',
        textColor: 'text-foreground',
        borderColor: 'border-amber-500',
        icon: XCircle,
      };
    }

    if (saleStatus === 'CANCELADO_POR_COBERTURA') {
      return {
        label: 'Cancelado por cobertura',
        color: 'bg-red-400',
        textColor: 'text-foreground',
        borderColor: 'border-red-400',
        icon: XCircle,
      };
    }

    if (saleStatus === 'CLIENTE_NO_PERMITE_INSTALACION') {
      return {
        label: 'Cliente no permite instalación',
        color: 'bg-rose-600',
        textColor: 'text-foreground',
        borderColor: 'border-rose-600',
        icon: XCircle,
      };
    }

    // Estados de validación
    switch (status) {
      case 'EN_PROCESO_VALIDACION':
        return {
          label: 'En validación',
          color: 'bg-orange-500',
          textColor: 'text-foreground',
          borderColor: 'border-orange-500',
          icon: Clock,
        };
      case 'APROBADA':
        return {
          label: 'Aprobada',
          color: 'bg-teal-500',
          textColor: 'text-foreground',
          borderColor: 'border-teal-500',
          icon: CheckCircle2,
        };
      case 'REQUIERE_DEPOSITO':
        return {
          label: 'Requiere Depósito',
          color: 'bg-yellow-500',
          textColor: 'text-foreground',
          borderColor: 'border-yellow-500',
          icon: DollarSign,
        };
      case 'NO_APLICA':
        return {
          label: 'No Aplica',
          color: 'bg-purple-500',
          textColor: 'text-foreground',
          borderColor: 'border-purple-500',
          icon: Ban,
        };
      case 'INCOBRABLE':
        return {
          label: 'Incobrable',
          color: 'bg-red-500',
          textColor: 'text-foreground',
          borderColor: 'border-red-500',
          icon: XCircle,
        };
      case 'DEUDA_MENOR_ANIO':
        return {
          label: 'Deuda Menor a un Año',
          color: 'bg-amber-500',
          textColor: 'text-foreground',
          borderColor: 'border-amber-500',
          icon: AlertCircle,
        };
      default:
        return {
          label: 'Sin Estado',
          color: 'bg-gray-500',
          textColor: 'text-foreground',
          borderColor: 'border-gray-500',
          icon: AlertCircle,
        };
    }
  }

  function handleViewDetail(validationStatus: string | null, saleStatus: string | null) {
    const params = new URLSearchParams();
    if (validationStatus) params.append('validationStatus', validationStatus);
    if (saleStatus) params.append('saleStatus', saleStatus);
    router.push(`/clients?${params.toString()}`);
  }

  if (loading) {
    return (
      <MainLayout>
        <TableSkeleton cols={4} showFilters={false} />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Bienvenido, {user?.nombre ?? user?.email} · {getPeriodLabel()}
          </p>
        </div>

        {/* Filtros — sticky mientras se hace scroll */}
        <div className="sticky top-0 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 py-2 bg-background/90 backdrop-blur border-b border-border">
          <div className={cn('grid items-center gap-2', user?.role === 'admin' ? 'grid-cols-3' : 'grid-cols-2')}>
            {user?.role === 'admin' && (
              <Select
                aria-label="Filtrar por vendedor"
                value={filterCreatedBy}
                onChange={(e) => setFilterCreatedBy(e.target.value)}
                className="h-9 text-sm"
              >
                <option value="">Todos los vendedores</option>
                {users.map((u) => {
                  const displayName = u.nombre && u.apellidos
                    ? `${u.nombre} ${u.apellidos}`
                    : u.email;
                  return (
                    <option key={u.id} value={u.id}>
                      {displayName}
                    </option>
                  );
                })}
              </Select>
            )}
            <Select
              aria-label="Filtrar por mes"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="h-9 text-sm"
            >
              <option value="">Todos los meses</option>
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </Select>
            <Select
              aria-label="Filtrar por año"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="h-9 text-sm"
            >
              {[0, 1, 2].map((i) => {
                const y = new Date().getFullYear() - i;
                return (
                  <option key={y} value={y.toString()}>
                    {y}
                  </option>
                );
              })}
            </Select>
          </div>
        </div>

        {/* Métricas Principales */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card className="shadow-sm border-t-4 border-t-primary hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Clientes</CardTitle>
              <div className="hidden sm:flex p-2 bg-primary/10 rounded-lg">
                <UserCircle className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{totalClients}</div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Registrados en {getPeriodLabel()}
              </p>
            </CardContent>
          </Card>

          {effectivenessData && (
            <>
              <Card className="shadow-sm border-t-4 border-t-blue-500 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Clientes</CardTitle>
                  <div className="hidden sm:flex p-2 bg-blue-500/10 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold">{effectivenessData.totalContacts}</div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Ingresados en {getPeriodLabel()}
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-t-4 border-t-green-500 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Instalaciones</CardTitle>
                  <div className="hidden sm:flex p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-green-600">{effectivenessData.installed}</div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Completadas en {getPeriodLabel()}
                  </p>
                </CardContent>
              </Card>

              {(() => {
                const e = effectivenessData.effectiveness;
                const color = e >= 50
                  ? { border: "border-t-green-500", bg: "bg-green-500/10", icon: "text-green-500", num: "text-green-600" }
                  : e >= 30
                  ? { border: "border-t-yellow-500", bg: "bg-yellow-500/10", icon: "text-yellow-500", num: "text-yellow-600" }
                  : { border: "border-t-red-500", bg: "bg-red-500/10", icon: "text-red-500", num: "text-red-600" };
                return (
                  <Card className={cn("shadow-sm border-t-4 hover:shadow-md transition-shadow", color.border)}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Efectividad</CardTitle>
                      <div className={cn("hidden sm:flex p-2 rounded-lg", color.bg)}>
                        <Target className={cn("h-4 w-4", color.icon)} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className={cn("text-2xl sm:text-3xl font-bold", color.num)}>
                        {e.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">Tasa de conversión</p>
                    </CardContent>
                  </Card>
                );
              })()}
            </>
          )}

          {/* Tarjeta Prospectos */}
          {(() => {
            const total = user?.role === 'admin'
              ? prospectStats.reduce((s, p) => s + p.totalProspectos, 0)
              : myProspectStat?.totalProspectos ?? 0;
            const conAlerta = user?.role === 'admin'
              ? prospectStats.reduce((s, p) => s + p.conAlerta, 0)
              : myProspectStat?.conAlerta ?? 0;
            const hasStat = user?.role === 'admin' ? true : myProspectStat !== null;
            if (!hasStat) return null;
            return (
              <>
                <Card className="shadow-sm border-t-4 border-t-indigo-500 hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Prospectos</CardTitle>
                    <div className="hidden sm:flex p-2 bg-indigo-500/10 rounded-lg">
                      <UserCircle className="h-4 w-4 text-indigo-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold">{total}</div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {user?.role === 'admin' ? 'Total asignados' : 'Asignados a ti'}
                    </p>
                  </CardContent>
                </Card>

                <Card className={cn(
                  "shadow-sm border-t-4 hover:shadow-md transition-shadow",
                  conAlerta > 0 ? "border-t-red-500" : "border-t-gray-300 dark:border-t-gray-600"
                )}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Con alerta</CardTitle>
                    <div className={cn(
                      "hidden sm:flex p-2 rounded-lg",
                      conAlerta > 0 ? "bg-red-500/10" : "bg-muted"
                    )}>
                      <AlertCircle className={cn("h-4 w-4", conAlerta > 0 ? "text-red-500" : "text-muted-foreground")} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={cn(
                      "text-2xl sm:text-3xl font-bold",
                      conAlerta > 0 ? "text-red-600" : "text-foreground"
                    )}>
                      {conAlerta}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {conAlerta > 0 ? 'Más de 2 días sin contacto' : 'Todo al día'}
                    </p>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </div>

        {/* Resumen por Estados */}
        {stats.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Resumen por Estado</CardTitle>
                  <CardDescription>
                    {totalClients} clientes · {getPeriodLabel()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {[...stats]
                .sort((a, b) => b.count - a.count)
                .map((stat, index) => {
                  const info = getStatusInfo(stat.validationStatus, stat.saleStatus);
                  const pct = totalClients > 0 ? Math.round((stat.count / totalClients) * 100) : 0;
                  return (
                    <button
                      key={index}
                      onClick={() => handleViewDetail(stat.validationStatus, stat.saleStatus)}
                      className="w-full group text-left"
                    >
                      <div className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-accent transition-colors">
                        <div className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", info.color)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium truncate">{info.label}</span>
                            <span className="text-sm font-bold ml-3 flex-shrink-0">{stat.count}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className={cn("h-1.5 rounded-full transition-all duration-500", info.color)}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 w-12 justify-end">
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </button>
                  );
                })}
            </CardContent>
          </Card>
        )}

        {/* Sección Inferior: KPIs y Análisis */}
        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">

          {/* KPI de Cumplimiento - 2/3 del ancho */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    KPI de Cumplimiento
                  </CardTitle>
                  {user?.role === 'admin' && filterMonth && (
                    <button
                      onClick={() => { setEditMetaValue(String(kpiMeta)); setEditingMeta(true); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3 w-3" /> Editar meta
                    </button>
                  )}
                </div>
                <CardDescription>
                  Meta: {kpiMeta} ventas instaladas por vendedor · {getPeriodLabel()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user?.role === 'admin' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {complianceStats.length === 0 ? (
                      <div className="md:col-span-2 py-10 text-center text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No hay ventas instaladas registradas</p>
                      </div>
                    ) : (
                      complianceStats.map((stat) => {
                        const barColor = stat.percentage >= 100
                          ? "bg-green-500"
                          : stat.percentage >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500";
                        const textColor = stat.percentage >= 100
                          ? "text-green-600"
                          : stat.percentage >= 50
                          ? "text-yellow-600"
                          : "text-red-600";
                        return (
                          <div key={stat.userId} className="space-y-3 p-4 rounded-lg border bg-card">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <UserCircle className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="text-sm font-medium truncate">
                                  {stat.nombre && stat.apellidos ? `${stat.nombre} ${stat.apellidos}` : stat.email}
                                </span>
                              </div>
                              <span className={cn("text-sm font-bold flex-shrink-0 ml-2", textColor)}>
                                {stat.percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className={cn("h-2 rounded-full transition-all duration-500", barColor)}
                                style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{stat.installed} / {stat.target} instaladas</span>
                              <span>{stat.pending} pendiente{stat.pending !== 1 ? 's' : ''}</span>
                            </div>
                            {stat.percentage >= 100 && (
                              <div className="flex items-center gap-1.5 text-green-600 text-xs bg-green-50 dark:bg-green-950/20 px-2 py-1.5 rounded">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="font-medium">Meta alcanzada</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  // Vista usuario: card única con ring chart pequeño
                  (() => {
                    const pct = complianceStats[0]?.percentage || 0;
                    const installed = complianceStats[0]?.installed || 0;
                    const target = complianceStats[0]?.target || 6;
                    const pending = complianceStats[0]?.pending || 0;
                    const strokeColor = pct >= 100 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444';
                    const textColor = pct >= 100 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600';
                    return (
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative h-32 w-32 flex-shrink-0">
                          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                            <circle
                              cx="18" cy="18" r="15.9" fill="none"
                              stroke={strokeColor} strokeWidth="3" strokeLinecap="round"
                              strokeDasharray={`${Math.min(pct, 100)} ${100 - Math.min(pct, 100)}`}
                              className="transition-all duration-700"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={cn("text-2xl font-bold", textColor)}>{pct}%</span>
                            <span className="text-xs text-muted-foreground">meta</span>
                          </div>
                        </div>
                        <div className="flex-1 space-y-3 w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Ventas instaladas</span>
                            <span className="text-xl font-bold">{installed} / {target}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Pendientes de instalación</span>
                            <span className="text-xl font-bold text-blue-600">{pending}</span>
                          </div>
                          <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                            {pct >= 100
                              ? '¡Meta alcanzada este período!'
                              : `Faltan ${target - installed} venta${target - installed !== 1 ? 's' : ''} para alcanzar la meta`}
                          </div>
                          {myProspectStat && (
                            <div className="mt-4 pt-4 border-t space-y-2">
                              <p className="text-sm font-medium">Mis Prospectos</p>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Total asignados</span>
                                <span className="text-xl font-bold">{myProspectStat.totalProspectos}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Con alerta</span>
                                <span className={cn(
                                  "text-xl font-bold",
                                  myProspectStat.conAlerta > 0 ? "text-red-600" : "text-green-600"
                                )}>
                                  {myProspectStat.conAlerta}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                                {myProspectStat.conAlerta === 0
                                  ? '¡Todo al día con tus prospectos!'
                                  : `${myProspectStat.conAlerta} prospecto${myProspectStat.conAlerta !== 1 ? 's' : ''} sin contacto en más de 2 días`}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          </div>

          {/* Ring chart de Efectividad - 1/3 del ancho */}
          <div>
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Efectividad
                </CardTitle>
                <CardDescription>
                  Conversión contactos → instalaciones · {getPeriodLabel()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {effectivenessData ? (() => {
                  const e = effectivenessData.effectiveness;
                  const strokeColor = e >= 50 ? '#22c55e' : e >= 30 ? '#eab308' : '#ef4444';
                  const textColor = e >= 50 ? 'text-green-600' : e >= 30 ? 'text-yellow-600' : 'text-red-600';
                  return (
                    <div className="flex flex-col items-center gap-5">
                      <div className="relative h-36 w-36">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15.9" fill="none"
                            stroke={strokeColor} strokeWidth="3" strokeLinecap="round"
                            strokeDasharray={`${Math.min(e, 100)} ${100 - Math.min(e, 100)}`}
                            className="transition-all duration-700"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={cn("text-2xl font-bold", textColor)}>{e.toFixed(1)}%</span>
                          <span className="text-xs text-muted-foreground">conversión</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 w-full pt-3 border-t text-center">
                        <div>
                          <div className="text-2xl font-bold">{effectivenessData.totalContacts}</div>
                          <div className="text-xs text-muted-foreground">Contactos</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">{effectivenessData.installed}</div>
                          <div className="text-xs text-muted-foreground">Instalaciones</div>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Sin datos
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Contactación de Prospectos — solo admin */}
        {user?.role === 'admin' && prospectStats.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Contactación de Prospectos
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/prospects')}
                  className="text-xs h-7 px-2 gap-1"
                >
                  Ver prospectos <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <CardDescription>Actividad de contactación · {getPeriodLabel()}</CardDescription>
            </CardHeader>
            <CardContent>
              <ProspectActivityCharts
                stats={prospectStats}
                porDia={prospectActivity.porDia}
                porTipificacion={prospectActivity.porTipificacion}
              />
            </CardContent>
          </Card>
        )}

        {/* Gráficos de tendencia */}
        {trendsData && (
          <TrendsCharts
            tendencia={trendsData.tendencia}
            comparativa={trendsData.comparativa}
            vendedores={trendsData.vendedores}
            year={filterYear || new Date().getFullYear().toString()}
            role={user?.role || 'user'}
          />
        )}
      </div>

      {/* Dialog: editar meta de KPI */}
      {editingMeta && (
        <Dialog open onOpenChange={() => setEditingMeta(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Editar meta · {getPeriodLabel()}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Define cuántas instalaciones debe lograr cada vendedor este período.
              </p>
              <div>
                <label className="text-sm font-medium block mb-1">Meta de instalaciones</label>
                <input
                  type="number"
                  min={1}
                  value={editMetaValue}
                  onChange={e => setEditMetaValue(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && saveMeta()}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setEditingMeta(false)}>Cancelar</Button>
              <Button onClick={saveMeta} disabled={savingMeta}>
                {savingMeta ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
}
