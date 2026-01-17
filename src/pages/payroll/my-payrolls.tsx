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
  Clock, 
  Download, 
  Eye,
  Loader2
} from 'lucide-react';
import { generatePayrollPDF } from '@/lib/payroll-pdf';
import { cn } from '@/lib/utils';

interface Payroll {
  id: string;
  userId: string;
  periodo: string;
  quincena: number;
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
    role: string;
  };
  aprobador: {
    id: string;
    email: string;
  } | null;
}

export default function MyPayrollsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role?: string; userId?: string } | null>(null);
  
  // Filtros - Por defecto solo mostrar aprobadas
  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [filterEstado, setFilterEstado] = useState('APROBADO');
  
  // Estados para diálogos
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingPayroll, setViewingPayroll] = useState<Payroll | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
      } else {
        const data = await response.json();
        setCurrentUser(data.user);
        
        if (data.user.role === 'admin') {
          router.push('/payroll');
          return;
        }

        await loadPayrolls();
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      loadPayrolls();
    }
  }, [filterPeriodo, filterEstado, currentUser]);

  async function loadPayrolls() {
    const params = new URLSearchParams();
    if (filterPeriodo) params.append('periodo', filterPeriodo);
    if (filterEstado) params.append('estado', filterEstado);

    const response = await fetch(`/api/payroll?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      setPayrolls(data.payrolls || []);
    }
  }

  async function handleView(payroll: Payroll) {
    const response = await fetch(`/api/payroll/${payroll.id}`);
    if (response.ok) {
      const data = await response.json();
      setViewingPayroll(data.payroll);
      setViewDialogOpen(true);
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
      
      // Los usuarios no ven el salario diario en el PDF
      const pdf = generatePayrollPDF(payrollCompleto, false);
      
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
            Mis Nóminas
          </h1>
          <p className="text-muted-foreground">
            Consulta tus comprobantes de pago
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
                  <option value="APROBADO">Aprobado</option>
                  <option value="PAGADO">Pagado</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de nóminas */}
        <Card>
          <CardHeader>
            <CardTitle>Mis Comprobantes de Pago</CardTitle>
            <CardDescription>
              {payrolls.length} nómina(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Quincena</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Aprobación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No hay nóminas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  payrolls.map((payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell>{formatearPeriodo(payroll.periodo)}</TableCell>
                      <TableCell>Q{payroll.quincena}</TableCell>
                      <TableCell>{payroll.diasTrabajados} días</TableCell>
                      <TableCell className="font-semibold">{formatearColones(payroll.total)}</TableCell>
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
                    <label className="text-sm font-medium text-muted-foreground">Días Trabajados</label>
                    <p className="text-sm font-medium">{viewingPayroll.diasTrabajados} días</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Salario Base</label>
                    <p className="text-sm font-medium">{formatearColones(viewingPayroll.salarioBase)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total a Pagar</label>
                    <p className="text-xl font-bold text-primary">{formatearColones(viewingPayroll.total)}</p>
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
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadPDF(viewingPayroll)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PDF
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
}
