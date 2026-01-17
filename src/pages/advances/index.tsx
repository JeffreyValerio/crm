import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Advance {
  id: string;
  userId: string;
  monto: number | string;
  quincenas: number;
  montoRestante: number | string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'EN_COBRO' | 'COMPLETADO';
  observaciones: string | null;
  aprobadoPor: string | null;
  aprobadoAt: string | Date | null;
  rechazadoAt: string | Date | null;
  completadoAt: string | Date | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  aprobador: {
    id: string;
    email: string;
  } | null;
}

export default function AdvancesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);
  
  // Estados para diálogos
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestMonto, setRequestMonto] = useState('');
  const [requestObservaciones, setRequestObservaciones] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');
  
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingAdvance, setViewingAdvance] = useState<Advance | null>(null);
  
  // Filtros
  const [filterEstado, setFilterEstado] = useState('');

  useEffect(() => {
    async function checkAuth() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
      } else {
        const data = await response.json();
        setCurrentUser(data.user);
        
        if (data.user.role === 'admin') {
          router.push('/advances/admin');
          return;
        }

        await loadAdvances();
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      loadAdvances();
    }
  }, [filterEstado, currentUser]);

  async function loadAdvances() {
    const params = new URLSearchParams();
    if (filterEstado) params.append('estado', filterEstado);

    const response = await fetch(`/api/advances?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      setAdvances(data.advances || []);
    }
  }

  function handleOpenRequestDialog() {
    setRequestMonto('');
    setRequestObservaciones('');
    setRequestError('');
    setRequestDialogOpen(true);
  }

  async function handleRequest() {
    const monto = parseFloat(requestMonto);
    
    if (!monto || monto <= 0) {
      setRequestError('El monto debe ser mayor a 0');
      return;
    }

    setRequesting(true);
    setRequestError('');

    try {
      const response = await fetch('/api/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: monto,
          observaciones: requestObservaciones || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await loadAdvances();
        setRequestDialogOpen(false);
        setRequestMonto('');
        setRequestObservaciones('');
        alert('Solicitud de adelanto enviada correctamente');
      } else {
        setRequestError(data.error || 'Error al enviar la solicitud');
      }
    } catch (error) {
      setRequestError('Error al procesar la solicitud');
    } finally {
      setRequesting(false);
    }
  }

  async function handleView(advance: Advance) {
    const response = await fetch(`/api/advances/${advance.id}`);
    if (response.ok) {
      const data = await response.json();
      setViewingAdvance(data.advance);
      setViewDialogOpen(true);
    }
  }

  function getEstadoLabel(estado: string) {
    switch (estado) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'APROBADO':
        return 'Aprobado';
      case 'RECHAZADO':
        return 'Rechazado';
      case 'EN_COBRO':
        return 'En Cobro';
      case 'COMPLETADO':
        return 'Completado';
      default:
        return estado;
    }
  }

  function getEstadoIcon(estado: string) {
    switch (estado) {
      case 'PENDIENTE':
        return <Clock className="h-4 w-4" />;
      case 'APROBADO':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'RECHAZADO':
        return <XCircle className="h-4 w-4" />;
      case 'EN_COBRO':
        return <AlertCircle className="h-4 w-4" />;
      case 'COMPLETADO':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  }

  function getEstadoColor(estado: string) {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-yellow-500/10 text-yellow-600';
      case 'APROBADO':
        return 'bg-blue-500/10 text-blue-600';
      case 'RECHAZADO':
        return 'bg-red-500/10 text-red-600';
      case 'EN_COBRO':
        return 'bg-orange-500/10 text-orange-600';
      case 'COMPLETADO':
        return 'bg-green-500/10 text-green-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  }

  function formatearColones(monto: number | string) {
    const num = typeof monto === 'string' ? parseFloat(monto) : monto;
    return `₡${num.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-primary" />
              Adelantos de Salario
            </h1>
            <p className="text-muted-foreground">
              Solicita adelantos de salario y consulta el estado de tus solicitudes
            </p>
          </div>
          <Button onClick={handleOpenRequestDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Solicitar Adelanto
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-1">
              <div>
                <label className="text-sm font-medium mb-2 block">Estado</label>
                <Select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="APROBADO">Aprobado</option>
                  <option value="RECHAZADO">Rechazado</option>
                  <option value="EN_COBRO">En Cobro</option>
                  <option value="COMPLETADO">Completado</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de adelantos */}
        <Card>
          <CardHeader>
            <CardTitle>Mis Solicitudes de Adelanto</CardTitle>
            <CardDescription>
              {advances.length} solicitud(es) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Monto</TableHead>
                  <TableHead>Quincenas</TableHead>
                  <TableHead>Monto Restante</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Solicitud</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No hay solicitudes de adelanto
                    </TableCell>
                  </TableRow>
                ) : (
                  advances.map((advance) => (
                    <TableRow key={advance.id}>
                      <TableCell className="font-medium">{formatearColones(advance.monto)}</TableCell>
                      <TableCell>
                        {advance.estado === 'PENDIENTE' 
                          ? '-' 
                          : `${advance.quincenas} quincena${advance.quincenas > 1 ? 's' : ''}`
                        }
                      </TableCell>
                      <TableCell>
                        {advance.estado === 'PENDIENTE' || advance.estado === 'RECHAZADO'
                          ? '-'
                          : formatearColones(advance.montoRestante)
                        }
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          getEstadoColor(advance.estado)
                        )}>
                          {getEstadoIcon(advance.estado)}
                          {getEstadoLabel(advance.estado)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(advance.createdAt).toLocaleDateString('es-CR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(advance)}
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog para solicitar adelanto */}
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Adelanto de Salario</DialogTitle>
              <DialogDescription>
                Solicita un adelanto de salario. El administrador revisará y aprobará tu solicitud.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Monto <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={requestMonto}
                  onChange={(e) => setRequestMonto(e.target.value)}
                  placeholder="Ej: 10000"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Monto en colones costarricenses (₡)
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Observaciones</label>
                <Textarea
                  value={requestObservaciones}
                  onChange={(e) => setRequestObservaciones(e.target.value)}
                  placeholder="Razón de la solicitud (opcional)"
                  rows={4}
                />
              </div>
              
              {requestError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {requestError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRequestDialogOpen(false)}
                disabled={requesting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRequest}
                disabled={requesting || !requestMonto}
              >
                {requesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Solicitar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para ver detalles */}
        {viewingAdvance && (
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
              <DialogHeader>
                <DialogTitle>Detalles del Adelanto</DialogTitle>
                <DialogDescription>
                  Información completa de la solicitud
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Monto Solicitado</label>
                    <p className="text-xl font-bold text-primary">{formatearColones(viewingAdvance.monto)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Estado</label>
                    <p className="text-sm">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        getEstadoColor(viewingAdvance.estado)
                      )}>
                        {getEstadoIcon(viewingAdvance.estado)}
                        {getEstadoLabel(viewingAdvance.estado)}
                      </span>
                    </p>
                  </div>
                  {viewingAdvance.estado !== 'PENDIENTE' && viewingAdvance.estado !== 'RECHAZADO' && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">En Cuántas Quincenas</label>
                        <p className="text-sm font-medium">{viewingAdvance.quincenas} quincena{viewingAdvance.quincenas > 1 ? 's' : ''}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Monto Restante</label>
                        <p className="text-sm font-medium">{formatearColones(viewingAdvance.montoRestante)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Monto por Quincena</label>
                        <p className="text-sm font-medium">
                          {formatearColones(
                            Number(viewingAdvance.monto) / viewingAdvance.quincenas
                          )}
                        </p>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha de Solicitud</label>
                    <p className="text-sm font-medium">
                      {new Date(viewingAdvance.createdAt).toLocaleDateString('es-CR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {viewingAdvance.aprobadoAt && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Fecha de Aprobación</label>
                      <p className="text-sm font-medium">
                        {new Date(viewingAdvance.aprobadoAt).toLocaleDateString('es-CR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  {viewingAdvance.rechazadoAt && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Fecha de Rechazo</label>
                      <p className="text-sm font-medium">
                        {new Date(viewingAdvance.rechazadoAt).toLocaleDateString('es-CR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  {viewingAdvance.completadoAt && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Fecha de Completado</label>
                      <p className="text-sm font-medium">
                        {new Date(viewingAdvance.completadoAt).toLocaleDateString('es-CR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
                
                {viewingAdvance.observaciones && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observaciones</label>
                    <p className="text-sm">{viewingAdvance.observaciones}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
}
