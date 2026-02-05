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
  Loader2,
  MoreVertical
} from 'lucide-react';
import { generatePayrollPDF } from '@/lib/payroll-pdf';
import { cn } from '@/lib/utils';

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
  const [generateQuincena, setGenerateQuincena] = useState<string>('1');
  const [selectedVendedores, setSelectedVendedores] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [generateSuccess, setGenerateSuccess] = useState(false);
  
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingPayroll, setViewingPayroll] = useState<Payroll | null>(null);
  
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [markingAsPaidId, setMarkingAsPaidId] = useState<string | null>(null);
  
  // Estados para el menú dropdown
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
      } else {
        const data = await response.json();
        setCurrentUser(data.user);
        
        // Cargar usuarios solo si es admin
        if (data.user.role === 'admin') {
          await loadUsers();
        }
        
        await loadPayrolls();
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      loadPayrolls();
    }
  }, [filterPeriodo, filterEstado, filterUserId, currentUser]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openMenuId]);

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

  // Función para calcular la quincena actual
  function getCurrentQuincena(): number {
    const ahora = new Date();
    const dia = ahora.getDate();
    // Quincena 1: días 1-15, Quincena 2: días 16-31
    return dia <= 15 ? 1 : 2;
  }

  function handleOpenGenerateDialog() {
    // Establecer el período actual por defecto
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    setGeneratePeriodo(`${año}-${mes}`);
    setGenerateQuincena(getCurrentQuincena().toString()); // Quincena actual por defecto
    setSelectedVendedores([]); // Limpiar selección
    setGenerateError('');
    setGenerateSuccess(false);
    setGenerateDialogOpen(true);
  }

  function handleToggleVendedor(userId: string) {
    setSelectedVendedores(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  }

  function handleSelectAllVendedores() {
    if (selectedVendedores.length === users.length) {
      setSelectedVendedores([]);
    } else {
      setSelectedVendedores(users.map(u => u.id));
    }
  }

  async function handleGenerate() {
    if (!generatePeriodo) {
      setGenerateError('El período es requerido');
      return;
    }

    if (!generateQuincena || (generateQuincena !== '1' && generateQuincena !== '2')) {
      setGenerateError('Debes seleccionar una quincena válida');
      return;
    }

    if (selectedVendedores.length === 0) {
      setGenerateError('Debes seleccionar al menos un vendedor');
      return;
    }

    setGenerating(true);
    setGenerateError('');
    setGenerateSuccess(false);

    const quincena = parseInt(generateQuincena);

    try {
      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          periodo: generatePeriodo,
          userIds: selectedVendedores,
          quincena: quincena
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setGenerateSuccess(true);
        await loadPayrolls();
        setTimeout(() => {
          setGenerateDialogOpen(false);
          setGeneratePeriodo('');
          setGenerateQuincena('1');
          setSelectedVendedores([]);
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


  async function handleView(payroll: Payroll) {
    const response = await fetch(`/api/payroll/${payroll.id}`);
    if (response.ok) {
      const data = await response.json();
      const payrollData = data.payroll;
      setViewingPayroll(payrollData);
      setViewDialogOpen(true);
    }
  }

  async function handleDownloadPDF(payroll: Payroll) {
    try {
      // Obtener los datos completos de la nómina
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

  async function handleMarkAsPaid(id: string) {
    if (!confirm('¿Estás seguro de que deseas marcar esta nómina como pagada?')) {
      return;
    }

    setMarkingAsPaidId(id);
    try {
      const response = await fetch(`/api/payroll/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'PAGADO' }),
      });

      if (response.ok) {
        await loadPayrolls();
        // Si hay una nómina abierta en el diálogo, actualizarla también
        if (viewingPayroll && viewingPayroll.id === id) {
          const updatedResponse = await fetch(`/api/payroll/${id}`);
          if (updatedResponse.ok) {
            const data = await updatedResponse.json();
            setViewingPayroll(data.payroll);
          }
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Error al marcar como pagada');
      }
    } catch (error) {
      alert('Error al procesar la solicitud');
    } finally {
      setMarkingAsPaidId(null);
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
              {currentUser?.role === 'admin' 
                ? 'Gestiona las nóminas y pagos de vendedores'
                : 'Consulta tus nóminas y pagos'}
            </p>
          </div>
          {currentUser?.role === 'admin' && (
            <Button onClick={handleOpenGenerateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Generar Nóminas
            </Button>
          )}
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("grid gap-4", currentUser?.role === 'admin' ? "md:grid-cols-3" : "md:grid-cols-1")}>
              <div>
                <label className="text-sm font-medium mb-2 block">Período</label>
                <Input
                  type="month"
                  value={filterPeriodo}
                  onChange={(e) => setFilterPeriodo(e.target.value)}
                  placeholder="YYYY-MM"
                />
              </div>
              {currentUser?.role === 'admin' && (
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
              )}
              {currentUser?.role === 'admin' && (
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
              )}
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
                  payrolls.map((payroll) => {
                    return (
                      <TableRow key={payroll.id}>
                        <TableCell className="font-medium">{getUserDisplayName(payroll.user)}</TableCell>
                        <TableCell>{formatearPeriodo(payroll.periodo)}</TableCell>
                        <TableCell>Q{payroll.quincena}</TableCell>
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
                        <div className="relative flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const button = e.currentTarget;
                              const rect = button.getBoundingClientRect();
                              setMenuPosition({
                                top: rect.bottom + 8,
                                right: window.innerWidth - rect.right,
                              });
                              setOpenMenuId(openMenuId === payroll.id ? null : payroll.id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
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

        {/* Menú flotante de acciones */}
        {openMenuId && menuPosition && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => {
                setOpenMenuId(null);
                setMenuPosition(null);
              }}
            />
            <div 
              className="fixed z-50 w-56 rounded-md border bg-background shadow-lg"
              style={{
                top: `${menuPosition.top}px`,
                right: `${menuPosition.right}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-1">
                {(() => {
                  const payroll = payrolls.find(p => p.id === openMenuId);
                  if (!payroll) return null;
                  return (
                    <>
                      <button
                        onClick={() => {
                          handleView(payroll);
                          setOpenMenuId(null);
                          setMenuPosition(null);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                      >
                        <Eye className="h-4 w-4" />
                        Ver detalles
                      </button>
                      <button
                        onClick={() => {
                          handleDownloadPDF(payroll);
                          setOpenMenuId(null);
                          setMenuPosition(null);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                      >
                        <Download className="h-4 w-4" />
                        Descargar PDF
                      </button>
                      {currentUser?.role === 'admin' && (
                        <>
                          <div className="h-px bg-border my-1" />
                          {payroll.estado === 'PENDIENTE' && (
                            <button
                              onClick={() => {
                                handleApprove(payroll.id);
                                setOpenMenuId(null);
                                setMenuPosition(null);
                              }}
                              disabled={approvingId === payroll.id}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left disabled:opacity-50"
                            >
                              {approvingId === payroll.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                              Aprobar nómina
                            </button>
                          )}
                          {payroll.estado === 'APROBADO' && (
                            <>
                              <button
                                onClick={() => {
                                  handleSendEmail(payroll.id);
                                  setOpenMenuId(null);
                                  setMenuPosition(null);
                                }}
                                disabled={sendingEmailId === payroll.id}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left disabled:opacity-50"
                              >
                                {sendingEmailId === payroll.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                                Enviar correo
                              </button>
                              <button
                                onClick={() => {
                                  handleMarkAsPaid(payroll.id);
                                  setOpenMenuId(null);
                                  setMenuPosition(null);
                                }}
                                disabled={markingAsPaidId === payroll.id}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left disabled:opacity-50"
                              >
                                {markingAsPaidId === payroll.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                Marcar como pagado
                              </button>
                            </>
                          )}
                          {payroll.estado === 'PAGADO' && (
                            <button
                              disabled
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm opacity-50 cursor-not-allowed text-left"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Ya está pagado
                            </button>
                          )}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </>
        )}

        {/* Dialog para generar nóminas */}
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generar Nómina</DialogTitle>
              <DialogDescription>
                Se generará la nómina para el período y quincena seleccionados
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
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
                    Seleccione el mes y año
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Quincena <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={generateQuincena}
                    onChange={(e) => setGenerateQuincena(e.target.value)}
                  >
                    <option value="1">Quincena 1 (días 1-15)</option>
                    <option value="2">Quincena 2 (días 16-31)</option>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Seleccione la quincena a generar
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">
                    Vendedores <span className="text-destructive">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllVendedores}
                    className="text-xs"
                  >
                    {selectedVendedores.length === users.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </Button>
                </div>
                <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                  {users.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay vendedores disponibles</p>
                  ) : (
                    users.map((user) => {
                      const displayName = getUserDisplayName(user);
                      const isSelected = selectedVendedores.includes(user.id);
                      return (
                        <label
                          key={user.id}
                          className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleVendedor(user.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm">{displayName}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedVendedores.length} de {users.length} vendedores seleccionados
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
                disabled={generating || !generatePeriodo || !generateQuincena || selectedVendedores.length === 0}
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
                    <label className="text-sm font-medium text-muted-foreground">Salario Quincenal</label>
                    <p className="text-sm font-medium">{formatearColones(viewingPayroll.salarioBase)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total a Pagar</label>
                    <p className="text-xl font-bold text-primary">
                      {formatearColones(200000)}
                    </p>
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
                <Button
                  variant="outline"
                  onClick={() => handleDownloadPDF(viewingPayroll)}
                  className="w-full sm:w-auto"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PDF
                </Button>
                {currentUser?.role === 'admin' && viewingPayroll.estado === 'PENDIENTE' && (
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
                {currentUser?.role === 'admin' && viewingPayroll.estado === 'APROBADO' && (
                  <>
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
                    <Button
                      onClick={() => {
                        handleMarkAsPaid(viewingPayroll.id);
                      }}
                      disabled={markingAsPaidId === viewingPayroll.id}
                    >
                      {markingAsPaidId === viewingPayroll.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Marcando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Marcar como Pagado
                        </>
                      )}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
}
