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
  Mail, 
  Download, 
  Eye,
  Calendar,
  Plus,
  Loader2
} from 'lucide-react';
import { generatePayrollPDF } from '@/lib/payroll-pdf';
import { cn } from '@/lib/utils';

interface AdvanceDetail {
  id: string;
  monto: number;
  quincenas: number;
  montoRestante: number;
  montoPorQuincena: number;
  descuentoEnEstaQuincena: number;
  montoRestanteDespues: number;
}

interface Payroll {
  id: string;
  userId: string;
  periodo: string;
  quincena: number;
  diasEsperados?: number;
  diasTrabajados: number;
  salarioBase: number | string;
  montoDiario: number | string;
  total: number | string;
  estado: 'PENDIENTE' | 'APROBADO' | 'PAGADO';
  aprobadoPor: string | null;
  aprobadoAt: string | Date | null;
  fechaPago: string | Date | null;
  comprobanteUrl: string | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    nombre: string | null;
    apellidos: string | null;
    role: string;
  };
  aprobador: {
    id: string;
    email: string;
    nombre: string | null;
    apellidos: string | null;
  } | null;
  adelantosDesglose?: AdvanceDetail[];
}

interface User {
  id: string;
  email: string;
  nombre?: string | null;
  apellidos?: string | null;
}

export default function PayrollPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);
  
  // Filtros
  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  
  // Estados para diálogos
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generatePeriodo, setGeneratePeriodo] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [generateSuccess, setGenerateSuccess] = useState(false);
  
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingPayroll, setViewingPayroll] = useState<Payroll | null>(null);
  const [editingDiasTrabajados, setEditingDiasTrabajados] = useState<number>(0);
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0);
  const [updatingDays, setUpdatingDays] = useState(false);
  
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
      } else {
        const data = await response.json();
        setCurrentUser(data.user);
        
        if (data.user.role !== 'admin') {
          router.push('/');
          return;
        }

        await Promise.all([loadUsers(), loadPayrolls()]);
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadPayrolls();
    }
  }, [filterPeriodo, filterEstado, filterUserId, currentUser]);

  async function loadPayrolls() {
    const params = new URLSearchParams();
    if (filterPeriodo) params.append('periodo', filterPeriodo);
    if (filterEstado) params.append('estado', filterEstado);
    if (filterUserId) params.append('userId', filterUserId);

    const response = await fetch(`/api/payroll?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      setPayrolls(data.payrolls || []);
    }
  }

  async function loadUsers() {
    const response = await fetch('/api/users');
    if (response.ok) {
      const data = await response.json();
      setUsers(data.users?.filter((u: { role: string }) => u.role === 'user') || []);
    }
  }

  function handleOpenGenerateDialog() {
    // Establecer el período actual por defecto
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    setGeneratePeriodo(`${año}-${mes}`);
    setGenerateError('');
    setGenerateSuccess(false);
    setGenerateDialogOpen(true);
  }

  async function handleGenerate() {
    if (!generatePeriodo) {
      setGenerateError('El período es requerido');
      return;
    }

    setGenerating(true);
    setGenerateError('');
    setGenerateSuccess(false);

    try {
      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo: generatePeriodo }),
      });

      const data = await response.json();

      if (response.ok) {
        setGenerateSuccess(true);
        await loadPayrolls();
        setTimeout(() => {
          setGenerateDialogOpen(false);
          setGeneratePeriodo('');
          setGenerateSuccess(false);
        }, 2000);
      } else {
        setGenerateError(data.error || 'Error al generar nóminas');
      }
    } catch (error) {
      setGenerateError('Error al procesar la solicitud');
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove(id: string) {
    if (!confirm('¿Estás seguro de que deseas aprobar esta nómina?')) {
      return;
    }

    setApprovingId(id);
    try {
      const response = await fetch(`/api/payroll/${id}/approve`, {
        method: 'PUT',
      });

      if (response.ok) {
        await loadPayrolls();
      } else {
        const data = await response.json();
        alert(data.error || 'Error al aprobar la nómina');
      }
    } catch (error) {
      alert('Error al procesar la solicitud');
    } finally {
      setApprovingId(null);
    }
  }

  async function handleSendEmail(id: string) {
    if (!confirm('¿Estás seguro de que deseas enviar el correo con el comprobante?')) {
      return;
    }

    setSendingEmailId(id);
    try {
      const response = await fetch(`/api/payroll/${id}/send-email`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Correo enviado correctamente a ${data.sentTo}`);
      } else {
        alert(data.error || 'Error al enviar el correo');
      }
    } catch (error) {
      alert('Error al procesar la solicitud');
    } finally {
      setSendingEmailId(null);
    }
  }

  async function handleView(payroll: Payroll) {
    const response = await fetch(`/api/payroll/${payroll.id}`);
    if (response.ok) {
      const data = await response.json();
      const payrollData = data.payroll;
      setViewingPayroll(payrollData);
      setEditingDiasTrabajados(payrollData.diasTrabajados);
      
      // Calcular total inicial
      const salarioBase = typeof payrollData.salarioBase === 'string' 
        ? parseFloat(payrollData.salarioBase) 
        : payrollData.salarioBase;
      const diasEsperados = payrollData.diasEsperados || payrollData.diasTrabajados;
      const totalCalculado = Math.round(salarioBase * (payrollData.diasTrabajados / diasEsperados));
      setCalculatedTotal(totalCalculado);
      
      setViewDialogOpen(true);
    }
  }

  function handleDiasTrabajadosChange(value: string) {
    const dias = parseInt(value) || 0;
    setEditingDiasTrabajados(dias);
    
    if (viewingPayroll) {
      const salarioBase = typeof viewingPayroll.salarioBase === 'string' 
        ? parseFloat(viewingPayroll.salarioBase) 
        : viewingPayroll.salarioBase;
      const diasEsperados = (viewingPayroll as any).diasEsperados || viewingPayroll.diasTrabajados;
      const total = Math.round(salarioBase * (dias / diasEsperados));
      setCalculatedTotal(total);
    }
  }

  async function handleUpdateDays() {
    if (!viewingPayroll) return;

    if (editingDiasTrabajados < 0) {
      alert('Los días trabajados no pueden ser negativos');
      return;
    }

    setUpdatingDays(true);
    try {
      const response = await fetch(`/api/payroll/${viewingPayroll.id}/update-days`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diasTrabajados: editingDiasTrabajados }),
      });

      const data = await response.json();

      if (response.ok) {
        // Actualizar el payroll local
        setViewingPayroll(data.payroll);
        setCalculatedTotal(
          typeof data.payroll.total === 'string' 
            ? parseFloat(data.payroll.total) 
            : data.payroll.total
        );
        // Recargar la lista de nóminas
        await loadPayrolls();
        alert('Días trabajados actualizados correctamente');
      } else {
        alert(data.error || 'Error al actualizar los días trabajados');
      }
    } catch (error) {
      alert('Error al procesar la solicitud');
    } finally {
      setUpdatingDays(false);
    }
  }

  async function handleDownloadPDF(payroll: Payroll) {
    try {
      // Obtener los datos completos de la nómina con desglose de adelantos
      const response = await fetch(`/api/payroll/${payroll.id}`);
      if (!response.ok) {
        throw new Error('Error al obtener datos de la nómina');
      }
      const data = await response.json();
      const payrollCompleto = data.payroll;
      
      // Solo admin puede ver el salario diario en el PDF
      const pdf = generatePayrollPDF(payrollCompleto, true);
      
      // Formatear nombre del archivo
      const [año, mes] = payroll.periodo.split('-');
      const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const nombreMes = meses[parseInt(mes) - 1];
      const filename = `Comprobante-Pago-${nombreMes}-${año}-Q${payroll.quincena}.pdf`;
      
      pdf.save(filename);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF');
    }
  }

  function getEstadoLabel(estado: string) {
    switch (estado) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'APROBADO':
        return 'Aprobado';
      case 'PAGADO':
        return 'Pagado';
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
      case 'PAGADO':
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
      case 'PAGADO':
        return 'bg-green-500/10 text-green-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  }

  function formatearColones(monto: number | string) {
    const num = typeof monto === 'string' ? parseFloat(monto) : monto;
    return `₡${num.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatearPeriodo(periodo: string) {
    const [año, mes] = periodo.split('-');
    const meses = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];
    return `${meses[parseInt(mes) - 1]} ${año}`;
  }

  function getUserDisplayName(user: { nombre?: string | null; apellidos?: string | null; email?: string } | null | undefined): string {
    if (!user) return 'N/A';
    if (user.nombre && user.apellidos) {
      return `${user.nombre} ${user.apellidos}`;
    }
    return user.email || 'N/A';
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
              Nóminas y Pagos
            </h1>
            <p className="text-muted-foreground">
              Gestiona las nóminas y pagos de vendedores
            </p>
          </div>
          <Button onClick={handleOpenGenerateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Generar Nóminas
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Período</label>
                <Input
                  type="month"
                  value={filterPeriodo}
                  onChange={(e) => setFilterPeriodo(e.target.value)}
                  placeholder="YYYY-MM"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Estado</label>
                <Select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="APROBADO">Aprobado</option>
                  <option value="PAGADO">Pagado</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Vendedor</label>
                <Select
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                >
                  <option value="">Todos los vendedores</option>
                  {users.map((user) => {
                    const displayName = getUserDisplayName(user);
                    return (
                      <option key={user.id} value={user.id}>
                        {displayName}
                      </option>
                    );
                  })}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de nóminas */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Nóminas</CardTitle>
            <CardDescription>
              {payrolls.length} nómina(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Quincena</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Adelanto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Aprobación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No hay nóminas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  payrolls.map((payroll) => {
                    const adelantosDesglose = payroll.adelantosDesglose || [];
                    const totalAdelantos = adelantosDesglose.reduce((sum, a) => sum + a.monto, 0);
                    const descuentoEnEstaQuincena = adelantosDesglose.reduce((sum, a) => sum + a.descuentoEnEstaQuincena, 0);
                    
                    return (
                      <TableRow key={payroll.id}>
                        <TableCell className="font-medium">{getUserDisplayName(payroll.user)}</TableCell>
                        <TableCell>{formatearPeriodo(payroll.periodo)}</TableCell>
                        <TableCell>Q{payroll.quincena}</TableCell>
                        <TableCell>{payroll.diasTrabajados} días</TableCell>
                        <TableCell className="font-semibold">{formatearColones(payroll.total)}</TableCell>
                        <TableCell>
                          {adelantosDesglose.length > 0 ? (
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="text-muted-foreground">Total: </span>
                                <span className="font-medium">{formatearColones(totalAdelantos)}</span>
                              </div>
                              <div className="text-xs text-red-600">
                                <span className="text-muted-foreground">Esta quincena: </span>
                                <span className="font-medium">-{formatearColones(descuentoEnEstaQuincena)}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                            getEstadoColor(payroll.estado)
                          )}>
                            {getEstadoIcon(payroll.estado)}
                            {getEstadoLabel(payroll.estado)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {payroll.aprobadoAt 
                            ? new Date(payroll.aprobadoAt).toLocaleDateString('es-CR')
                            : '-'
                          }
                        </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(payroll)}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPDF(payroll)}
                            title="Descargar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {payroll.estado === 'PENDIENTE' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(payroll.id)}
                              disabled={approvingId === payroll.id}
                              title="Aprobar nómina"
                            >
                              {approvingId === payroll.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {payroll.estado === 'APROBADO' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendEmail(payroll.id)}
                              disabled={sendingEmailId === payroll.id}
                              title="Enviar correo"
                            >
                              {sendingEmailId === payroll.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog para generar nóminas */}
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generar Nóminas del Mes</DialogTitle>
              <DialogDescription>
                Se generarán nóminas para todos los vendedores activos. Se crearán 2 nóminas por vendedor (quincena 1 y 2).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Período <span className="text-destructive">*</span>
                </label>
                <Input
                  type="month"
                  value={generatePeriodo}
                  onChange={(e) => setGeneratePeriodo(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Seleccione el mes y año para generar las nóminas
                </p>
              </div>
              
              {generateError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {generateError}
                </div>
              )}
              
              {generateSuccess && (
                <div className="bg-green-500/10 text-green-600 text-sm p-3 rounded-md">
                  Nóminas generadas correctamente
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setGenerateDialogOpen(false)}
                disabled={generating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generating || !generatePeriodo}
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Generar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para ver detalles */}
        {viewingPayroll && (
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
              <DialogHeader>
                <DialogTitle>Detalles de la Nómina</DialogTitle>
                <DialogDescription>
                  Información completa del comprobante de pago
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Vendedor</label>
                    <p className="text-sm font-medium">{getUserDisplayName(viewingPayroll.user)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Período</label>
                    <p className="text-sm font-medium">{formatearPeriodo(viewingPayroll.periodo)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Quincena</label>
                    <p className="text-sm font-medium">Q{viewingPayroll.quincena}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Estado</label>
                    <p className="text-sm">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        getEstadoColor(viewingPayroll.estado)
                      )}>
                        {getEstadoIcon(viewingPayroll.estado)}
                        {getEstadoLabel(viewingPayroll.estado)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Días Trabajados <span className="text-destructive">*</span>
                      {viewingPayroll.estado === 'PAGADO' && (
                        <span className="text-xs text-muted-foreground ml-2">(No editable - Ya pagada)</span>
                      )}
                    </label>
                    {viewingPayroll.estado !== 'PAGADO' ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          value={editingDiasTrabajados}
                          onChange={(e) => handleDiasTrabajadosChange(e.target.value)}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">días</span>
                        {(viewingPayroll as any).diasEsperados && (
                          <span className="text-xs text-muted-foreground">
                            (Esperados: {(viewingPayroll as any).diasEsperados})
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-medium">{viewingPayroll.diasTrabajados} días</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Salario por Día</label>
                    <p className="text-sm font-medium">{formatearColones(viewingPayroll.montoDiario)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Salario Base</label>
                    <p className="text-sm font-medium">{formatearColones(viewingPayroll.salarioBase)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total a Pagar</label>
                    <p className={cn(
                      "text-xl font-bold",
                      calculatedTotal !== (typeof viewingPayroll.total === 'string' ? parseFloat(viewingPayroll.total) : viewingPayroll.total)
                        ? "text-orange-600"
                        : "text-primary"
                    )}>
                      {formatearColones(
                        calculatedTotal !== (typeof viewingPayroll.total === 'string' ? parseFloat(viewingPayroll.total) : viewingPayroll.total)
                          ? calculatedTotal
                          : viewingPayroll.total
                      )}
                    </p>
                    {calculatedTotal !== (typeof viewingPayroll.total === 'string' ? parseFloat(viewingPayroll.total) : viewingPayroll.total) && (
                      <p className="text-xs text-orange-600 mt-1">
                        Nuevo total (no guardado)
                      </p>
                    )}
                  </div>
                  {viewingPayroll.aprobadoAt && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Fecha de Aprobación</label>
                        <p className="text-sm font-medium">
                          {new Date(viewingPayroll.aprobadoAt).toLocaleDateString('es-CR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {viewingPayroll.aprobador && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Aprobado Por</label>
                          <p className="text-sm font-medium">{getUserDisplayName(viewingPayroll.aprobador)}</p>
                        </div>
                      )}
                    </>
                  )}
                  {viewingPayroll.fechaPago && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Fecha de Pago</label>
                      <p className="text-sm font-medium">
                        {new Date(viewingPayroll.fechaPago).toLocaleDateString('es-CR')}
                      </p>
                    </div>
                  )}
                </div>
                
                {viewingPayroll.observaciones && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observaciones</label>
                    <p className="text-sm">{viewingPayroll.observaciones}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {viewingPayroll.estado !== 'PAGADO' && 
                 editingDiasTrabajados !== viewingPayroll.diasTrabajados && (
                  <Button
                    onClick={handleUpdateDays}
                    disabled={updatingDays}
                    className="w-full sm:w-auto"
                  >
                    {updatingDays ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar Cambios'
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => handleDownloadPDF(viewingPayroll)}
                  className="w-full sm:w-auto"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PDF
                </Button>
                {viewingPayroll.estado === 'PENDIENTE' && (
                  <Button
                    onClick={() => {
                      setViewDialogOpen(false);
                      handleApprove(viewingPayroll.id);
                    }}
                    disabled={approvingId === viewingPayroll.id}
                  >
                    {approvingId === viewingPayroll.id ? (
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
                )}
                {viewingPayroll.estado === 'APROBADO' && (
                  <Button
                    onClick={() => {
                      setViewDialogOpen(false);
                      handleSendEmail(viewingPayroll.id);
                    }}
                    disabled={sendingEmailId === viewingPayroll.id}
                  >
                    {sendingEmailId === viewingPayroll.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Enviar Correo
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
}
