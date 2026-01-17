import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye,
  Loader2,
  AlertCircle,
  Users
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

interface User {
  id: string;
  email: string;
}

export default function AdvancesAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);
  
  // Filtros
  const [filterEstado, setFilterEstado] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  
  // Estados para diálogos
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingAdvance, setViewingAdvance] = useState<Advance | null>(null);
  
  // Estados para aprobar
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveQuincenas, setApproveQuincenas] = useState('1');
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState('');
  
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
      } else {
        const data = await response.json();
        setCurrentUser(data.user);
        
        if (data.user.role !== 'admin') {
          router.push('/advances');
          return;
        }

        await Promise.all([loadUsers(), loadAdvances()]);
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadAdvances();
    }
  }, [filterEstado, filterUserId, currentUser]);

  async function loadAdvances() {
    const params = new URLSearchParams();
    if (filterEstado) params.append('estado', filterEstado);
    if (filterUserId) params.append('userId', filterUserId);

    const response = await fetch(`/api/advances?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      setAdvances(data.advances || []);
    }
  }

  async function loadUsers() {
    const response = await fetch('/api/users');
    if (response.ok) {
      const data = await response.json();
      setUsers(data.users?.filter((u: { role: string }) => u.role === 'user') || []);
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

  function handleOpenApproveDialog(advance: Advance) {
    setViewingAdvance(advance);
    setApproveQuincenas('1');
    setApproveError('');
    setApproveDialogOpen(true);
  }

  async function handleApprove() {
    if (!viewingAdvance) return;

    const quincenas = parseInt(approveQuincenas);
    if (!quincenas || quincenas < 1) {
      setApproveError('El número de quincenas debe ser al menos 1');
      return;
    }

    setApproving(true);
    setApproveError('');

    try {
      const response = await fetch(`/api/advances/${viewingAdvance.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quincenas }),
      });

      const data = await response.json();

      if (response.ok) {
        await loadAdvances();
        setApproveDialogOpen(false);
        setViewingAdvance(null);
        alert('Adelanto aprobado correctamente');
      } else {
        setApproveError(data.error || 'Error al aprobar el adelanto');
      }
    } catch (error) {
      setApproveError('Error al procesar la solicitud');
    } finally {
      setApproving(false);
    }
  }

  async function handleReject(id: string) {
    if (!confirm('¿Estás seguro de que deseas rechazar este adelanto?')) {
      return;
    }

    setRejectingId(id);
    try {
      const response = await fetch(`/api/advances/${id}/reject`, {
        method: 'PUT',
      });

      if (response.ok) {
        await loadAdvances();
        alert('Adelanto rechazado correctamente');
      } else {
        const data = await response.json();
        alert(data.error || 'Error al rechazar el adelanto');
      }
    } catch (error) {
      alert('Error al procesar la solicitud');
    } finally {
      setRejectingId(null);
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-primary" />
            Administrar Adelantos
          </h1>
          <p className="text-muted-foreground">
            Aprueba o rechaza solicitudes de adelanto de salario
          </p>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
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
              <div>
                <label className="text-sm font-medium mb-2 block">Usuario</label>
                <Select
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                >
                  <option value="">Todos los usuarios</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de adelantos */}
        <Card>
          <CardHeader>
            <CardTitle>Solicitudes de Adelanto</CardTitle>
            <CardDescription>
              {advances.length} solicitud(es) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
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
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No hay solicitudes de adelanto
                    </TableCell>
                  </TableRow>
                ) : (
                  advances.map((advance) => (
                    <TableRow key={advance.id}>
                      <TableCell className="font-medium">{advance.user.email}</TableCell>
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
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(advance)}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {advance.estado === 'PENDIENTE' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenApproveDialog(advance)}
                                disabled={approvingId === advance.id}
                                title="Aprobar adelanto"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReject(advance.id)}
                                disabled={rejectingId === advance.id}
                                title="Rechazar adelanto"
                              >
                                {rejectingId === advance.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
                    <label className="text-sm font-medium text-muted-foreground">Usuario</label>
                    <p className="text-sm font-medium">{viewingAdvance.user.email}</p>
                  </div>
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

        {/* Dialog para aprobar */}
        {viewingAdvance && viewingAdvance.estado === 'PENDIENTE' && (
          <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aprobar Adelanto</DialogTitle>
                <DialogDescription>
                  Define en cuántas quincenas se cobrará este adelanto
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Usuario
                  </label>
                  <p className="text-sm">{viewingAdvance.user.email}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Monto Solicitado
                  </label>
                  <p className="text-xl font-bold text-primary">{formatearColones(viewingAdvance.monto)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    En Cuántas Quincenas <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={approveQuincenas}
                    onChange={(e) => setApproveQuincenas(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    El monto se descontará de forma proporcional en cada quincena
                  </p>
                  {approveQuincenas && parseInt(approveQuincenas) > 0 && (
                    <p className="text-sm font-medium mt-2 text-primary">
                      Descuento por quincena: {formatearColones(
                        Number(viewingAdvance.monto) / parseInt(approveQuincenas)
                      )}
                    </p>
                  )}
                </div>
                
                {approveError && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                    {approveError}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setApproveDialogOpen(false)}
                  disabled={approving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approving || !approveQuincenas}
                >
                  {approving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Aprobando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Aprobar
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
}
