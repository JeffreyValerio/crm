import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, CheckCircle2, AlertCircle, XCircle, DollarSign, Ban } from 'lucide-react';

interface ClientStats {
  validationStatus: string | null;
  saleStatus: string | null;
  count: number;
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string; role?: string } | null>(null);
  const [stats, setStats] = useState<ClientStats[]>([]);
  const [totalClients, setTotalClients] = useState(0);

  useEffect(() => {
    async function checkAuth() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
      } else {
        const data = await response.json();
        setUser(data.user);
        await loadStats();
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  async function loadStats() {
    try {
      const response = await fetch('/api/clients');
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resumen por estado</h1>
          <p className="text-muted-foreground">
            Bienvenido de vuelta, {user?.email}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stats.map((stat, index) => {
            const info = getStatusInfo(stat.validationStatus, stat.saleStatus);
            const Icon = info.icon;
            
            return (
              <Card
                key={index}
                className={`${info.borderColor} border-2 hover:shadow-lg transition-shadow`}
              >
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`${info.color} p-3 rounded-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${info.textColor}`}>
                          {stat.count.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className={`text-base font-semibold ${info.textColor}`}>
                        {info.label}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`w-full ${info.borderColor} border-2`}
                      onClick={() => handleViewDetail(stat.validationStatus, stat.saleStatus)}
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

        {stats.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No hay clientes registrados</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClients}</div>
              <p className="text-xs text-muted-foreground">Clientes registrados</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
