import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ArrowRight, Clock, CheckCircle2, AlertCircle, XCircle, DollarSign, Ban, Target, TrendingUp, UserCircle } from 'lucide-react';

interface ClientStats {
  validationStatus: string | null;
  saleStatus: string | null;
  count: number;
}

interface User {
  id: string;
  email: string;
}

interface ComplianceStats {
  userId: string;
  email: string;
  installed: number;
  target: number;
  percentage: number;
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string; role?: string } | null>(null);
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

  useEffect(() => {
    async function checkAuth() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
      } else {
        const data = await response.json();
        setUser(data.user);
        setCurrentUserId(data.user?.userId || null);
        
        // Si es admin, cargar usuarios y filtro por creador
        if (data.user?.role === 'admin') {
          if (router.query.createdBy) {
            setFilterCreatedBy(router.query.createdBy as string);
          }
          await loadUsers();
        }
        
        await loadStats();
        await loadComplianceStats();
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
        setUsers(data.users?.map((u: { id: string; email: string }) => ({ id: u.id, email: u.email })) || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  async function loadStats() {
    try {
      const params = new URLSearchParams();
      if (user?.role === 'admin' && filterCreatedBy) {
        params.append('createdBy', filterCreatedBy);
      }
      
      const response = await fetch(`/api/clients?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const clients = data.clients || [];
        setTotalClients(clients.length);

        // Agrupar por estados
        const statsMap = new Map<string, ClientStats>();

        clients.forEach((client: any) => {
          // Clave para agrupar: validationStatus + saleStatus
          const key = `${client.validationStatus || 'SIN_ESTADO'}_${client.saleStatus || 'SIN_VENTA'}`;
          
          if (!statsMap.has(key)) {
            statsMap.set(key, {
              validationStatus: client.validationStatus,
              saleStatus: client.saleStatus,
              count: 0,
            });
          }
          
          const stat = statsMap.get(key)!;
          stat.count++;
        });

        setStats(Array.from(statsMap.values()));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadEffectivenessData() {
    try {
      const params = new URLSearchParams();
      if (user?.role === 'admin' && filterCreatedBy) {
        params.append('createdBy', filterCreatedBy);
      }
      
      const response = await fetch(`/api/clients?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const clients = data.clients || [];
        
        // Filtrar por año y mes
        const filteredClients = clients.filter((client: any) => {
          const clientDate = new Date(client.createdAt);
          const clientYear = clientDate.getFullYear().toString();
          const clientMonth = (clientDate.getMonth() + 1).toString();
          
          const matchesYear = !filterYear || filterYear === clientYear;
          const matchesMonth = !filterMonth || filterMonth === clientMonth;
          
          return matchesYear && matchesMonth;
        });
        
        const totalContacts = filteredClients.length;
        const installed = filteredClients.filter((client: any) => 
          client.saleStatus === 'INSTALADA'
        ).length;
        
        const effectiveness = totalContacts > 0 ? (installed / totalContacts) * 100 : 0;
        
        setEffectivenessData({
          totalContacts,
          installed,
          effectiveness: Math.round(effectiveness * 100) / 100, // Redondear a 2 decimales
        });
      }
    } catch (error) {
      console.error('Error loading effectiveness data:', error);
    }
  }

  async function loadComplianceStats() {
    try {
      const params = new URLSearchParams();
      // Para admin, cargar todos los clientes. Para usuarios regulares, ya están filtrados por creador
      const response = await fetch(`/api/clients?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const clients = data.clients || [];
        
        const TARGET_SALES = 10; // Meta de ventas instaladas
        const complianceMap = new Map<string, { userId: string; email: string; installed: number }>();

        // Contar clientes instalados por vendedor
        clients.forEach((client: any) => {
          if (client.saleStatus === 'INSTALADA' && client.creator) {
            const userId = client.creator.id;
            const email = client.creator.email;
            
            if (!complianceMap.has(userId)) {
              complianceMap.set(userId, {
                userId,
                email,
                installed: 0,
              });
            }
            
            const stats = complianceMap.get(userId)!;
            stats.installed++;
          }
        });

        // Convertir a array y calcular porcentajes
        const stats: ComplianceStats[] = Array.from(complianceMap.values()).map((stat) => {
          const percentage = Math.min((stat.installed / TARGET_SALES) * 100, 100);
          return {
            ...stat,
            target: TARGET_SALES,
            percentage: Math.round(percentage),
          };
        });

        // Si no es admin, solo mostrar el cumplimiento del usuario actual
        if (user?.role !== 'admin' && currentUserId) {
          const userStats = stats.find((s) => s.userId === currentUserId);
          setComplianceStats(userStats ? [userStats] : [{
            userId: currentUserId,
            email: user?.email || 'Usuario',
            installed: 0,
            target: TARGET_SALES,
            percentage: 0,
          }]);
        } else {
          // Para admin, mostrar todos los vendedores
          // Si un vendedor no tiene ventas, no aparecerá aquí. Podríamos agregarlo si queremos mostrar todos los usuarios.
          setComplianceStats(stats);
        }
      }
    } catch (error) {
      console.error('Error loading compliance stats:', error);
    }
  }

  useEffect(() => {
    if (!loading && user) {
      loadStats();
      loadComplianceStats();
      loadEffectivenessData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCreatedBy, filterYear, filterMonth, loading, user]);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Bienvenido de vuelta, {user?.email}
          </p>
        </div>

        {/* Filtros - Diseño más compacto */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Filtros de Análisis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {user?.role === 'admin' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Creado Por</label>
                  <Select
                    value={filterCreatedBy}
                    onChange={(e) => setFilterCreatedBy(e.target.value)}
                  >
                    <option value="">Todos los usuarios</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-2 block">Año</label>
                <Select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                >
                  <option value={new Date().getFullYear().toString()}>
                    {new Date().getFullYear()}
                  </option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Mes</label>
                <Select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas Principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-2 hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <UserCircle className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalClients}</div>
              <p className="text-xs text-muted-foreground mt-1">Clientes registrados</p>
            </CardContent>
          </Card>
          
          {effectivenessData && (
            <>
              <Card className="border-2 hover:shadow-lg transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contactos</CardTitle>
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{effectivenessData.totalContacts}</div>
                  <p className="text-xs text-muted-foreground mt-1">Ingresados en el período</p>
                </CardContent>
              </Card>
              
              <Card className="border-2 hover:shadow-lg transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Instalaciones</CardTitle>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{effectivenessData.installed}</div>
                  <p className="text-xs text-muted-foreground mt-1">Ventas completadas</p>
                </CardContent>
              </Card>
              
              <Card className="border-2 hover:shadow-lg transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Efectividad</CardTitle>
                  <Target className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "text-3xl font-bold",
                    effectivenessData.effectiveness >= 50 ? "text-green-600" : 
                    effectivenessData.effectiveness >= 30 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {effectivenessData.effectiveness.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Tasa de conversión</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Resumen por Estados */}
        {stats.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Resumen por Estado</h2>
              <p className="text-muted-foreground">
                Distribución de clientes según su estado actual
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {stats.map((stat, index) => {
                const info = getStatusInfo(stat.validationStatus, stat.saleStatus);
                const Icon = info.icon;
                
                return (
                  <Card
                    key={index}
                    className={`${info.borderColor} border-2 hover:shadow-xl transition-all cursor-pointer`}
                    onClick={() => handleViewDetail(stat.validationStatus, stat.saleStatus)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`${info.color} p-3 rounded-lg shadow-sm`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-right">
                          <div className={`text-3xl font-bold ${info.textColor}`}>
                            {stat.count}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className={`text-base font-semibold ${info.textColor}`}>
                          {info.label}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-full ${info.borderColor} border hover:${info.color} hover:text-white`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(stat.validationStatus, stat.saleStatus);
                          }}
                        >
                          Ver detalle
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Sección Inferior: KPIs y Análisis */}
        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          {/* KPI de Cumplimiento - 2/3 del ancho */}
          <div className="lg:col-span-2 space-y-4 flex flex-col">
            <div>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                KPI de Cumplimiento
              </h2>
              <p className="text-muted-foreground mt-1">
                Meta: 10 ventas instaladas por vendedor
              </p>
            </div>
            
            {user?.role === 'admin' ? (
              <div className="grid gap-4 md:grid-cols-2">
                {complianceStats.map((stat) => (
                  <Card key={stat.userId} className="border-2 hover:shadow-xl transition-all">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-primary" />
                        {stat.email}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-muted-foreground">Ventas Instaladas</span>
                            <span className="text-2xl font-bold">
                              {stat.installed} / {stat.target}
                            </span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-3 mb-2">
                            <div
                              className={cn(
                                "h-3 rounded-full transition-all duration-300",
                                stat.percentage >= 100 
                                  ? "bg-green-500" 
                                  : stat.percentage >= 50 
                                  ? "bg-yellow-500" 
                                  : "bg-red-500"
                              )}
                              style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Cumplimiento</span>
                            <span className={cn(
                              "text-base font-bold",
                              stat.percentage >= 100 
                                ? "text-green-600" 
                                : stat.percentage >= 50 
                                ? "text-yellow-600" 
                                : "text-red-600"
                            )}>
                              {stat.percentage}%
                            </span>
                          </div>
                        </div>
                        {stat.percentage >= 100 && (
                          <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 dark:bg-green-950/20 p-2 rounded-md">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-medium">Meta alcanzada</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {complianceStats.length === 0 && (
                  <Card className="lg:col-span-2">
                    <CardContent className="py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No hay ventas instaladas registradas</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="border-2 hover:shadow-xl transition-all flex-1 flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Mi Cumplimiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-5 flex-1">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">Ventas Instaladas</span>
                        <span className="text-3xl font-bold">
                          {complianceStats[0]?.installed || 0} / {complianceStats[0]?.target || 10}
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-4 mb-3">
                        <div
                          className={cn(
                            "h-4 rounded-full transition-all duration-300",
                            (complianceStats[0]?.percentage || 0) >= 100 
                              ? "bg-green-500" 
                              : (complianceStats[0]?.percentage || 0) >= 50 
                              ? "bg-yellow-500" 
                              : "bg-red-500"
                          )}
                          style={{ width: `${Math.min((complianceStats[0]?.percentage || 0), 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Cumplimiento</span>
                        <span className={cn(
                          "text-xl font-bold",
                          (complianceStats[0]?.percentage || 0) >= 100 
                            ? "text-green-600" 
                            : (complianceStats[0]?.percentage || 0) >= 50 
                            ? "text-yellow-600" 
                            : "text-red-600"
                        )}>
                          {complianceStats[0]?.percentage || 0}%
                        </span>
                      </div>
                    </div>
                    {(complianceStats[0]?.percentage || 0) >= 100 && (
                      <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-semibold">¡Meta alcanzada! 🎉</span>
                      </div>
                    )}
                    {(complianceStats[0]?.percentage || 0) < 100 && (
                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                        Te faltan {(complianceStats[0]?.target || 10) - (complianceStats[0]?.installed || 0)} ventas para alcanzar la meta
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Gráfica de Efectividad - 1/3 del ancho */}
          <div className="space-y-4 flex flex-col">
            <div>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                Efectividad
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Conversión de contactos a instalaciones
              </p>
            </div>
            <Card className="border-2 hover:shadow-xl transition-all flex-1 flex flex-col">
              <CardContent className="pt-6 flex-1 flex flex-col">
                {effectivenessData ? (
                  <div className="space-y-4 flex-1 flex flex-col">
                    {/* Métricas rápidas */}
                    <div className="grid gap-3 grid-cols-3 text-center">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Contactos</div>
                        <div className="text-2xl font-bold">{effectivenessData.totalContacts}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Instalaciones</div>
                        <div className="text-2xl font-bold text-green-600">{effectivenessData.installed}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Efectividad</div>
                        <div className={cn(
                          "text-2xl font-bold",
                          effectivenessData.effectiveness >= 50 ? "text-green-600" : 
                          effectivenessData.effectiveness >= 30 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {effectivenessData.effectiveness.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Gráfica comparativa */}
                    <div className="pt-4 border-t">
                      <div className="flex items-end gap-3 h-20 mb-3">
                        <div className="flex-1 flex flex-col items-center gap-2">
                          <div className="relative w-full h-full flex items-end bg-secondary rounded-t">
                            <div
                              className="w-full bg-blue-500 rounded-t transition-all duration-500"
                              style={{ height: `${Math.min((effectivenessData.totalContacts / Math.max(effectivenessData.totalContacts, effectivenessData.installed)) * 100, 100)}%` }}
                              title={`Contactos: ${effectivenessData.totalContacts}`}
                            />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">Contactos</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-2">
                          <div className="relative w-full h-full flex items-end bg-secondary rounded-t">
                            <div
                              className={cn(
                                "w-full rounded-t transition-all duration-500",
                                effectivenessData.effectiveness >= 50 ? "bg-green-500" : 
                                effectivenessData.effectiveness >= 30 ? "bg-yellow-500" : "bg-red-500"
                              )}
                              style={{ height: `${Math.min((effectivenessData.installed / Math.max(effectivenessData.totalContacts, effectivenessData.installed)) * 100, 100)}%` }}
                              title={`Instalaciones: ${effectivenessData.installed}`}
                            />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">Instalaciones</span>
                        </div>
                      </div>
                      
                      {/* Barra de progreso */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Tasa de conversión</span>
                          <span className={cn(
                            "font-semibold",
                            effectivenessData.effectiveness >= 50 ? "text-green-600" : 
                            effectivenessData.effectiveness >= 30 ? "text-yellow-600" : "text-red-600"
                          )}>
                            {effectivenessData.effectiveness.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className={cn(
                              "h-2 rounded-full transition-all duration-300",
                              effectivenessData.effectiveness >= 50 ? "bg-green-500" : 
                              effectivenessData.effectiveness >= 30 ? "bg-yellow-500" : "bg-red-500"
                            )}
                            style={{ width: `${Math.min(effectivenessData.effectiveness, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Cargando datos...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
