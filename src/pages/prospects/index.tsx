import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Search, ChevronLeft, ChevronRight, UserCheck, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Usuario {
  id: string;
  nombre: string | null;
  apellidos: string | null;
  email: string;
}

interface Prospecto {
  id: string;
  nroOrden: string;
  cliente: string | null;
  idCliente: string | null;
  estado: string | null;
  prioridad: string | null;
  contrato: string | null;
  contratoLigado: string | null;
  tipoOrden: string | null;
  motivo: string | null;
  descripcion: string | null;
  tecnico: string | null;
  usuarioCreador: string | null;
  usuarioEnvio: string | null;
  contactoNombre: string | null;
  contactoApellido: string | null;
  telCelular: string | null;
  telInstalacion: string | null;
  telOficina: string | null;
  email: string | null;
  sucursal: string | null;
  despacho: string | null;
  provincia: string | null;
  canton: string | null;
  distrito: string | null;
  barrio: string | null;
  direccion: string | null;
  observaciones: string | null;
  observacionesInternas: string | null;
  banderaCable: string | null;
  banderaInternet: string | null;
  facturador: string | null;
  tap: string | null;
  placa: string | null;
  poste: string | null;
  latitud: string | null;
  longitud: string | null;
  asignadoA: string | null;
  asignado: Usuario | null;
  createdAt: string;
}

export default function ProspectsPage() {
  const [loading, setLoading] = useState(true);
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [session, setSession] = useState<{ role: string; userId: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAsignado, setFilterAsignado] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewingProspecto, setViewingProspecto] = useState<Prospecto | null>(null);
  const [assigningProspecto, setAssigningProspecto] = useState<Prospecto | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [obsInternas, setObsInternas] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const LIMIT = 15;

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setSession(d));
  }, []);

  useEffect(() => {
    if (!session) return;
    if (session.role === 'admin') {
      fetch('/api/users').then(r => r.json()).then(d => setUsuarios(d.users || []));
    }
    fetchProspectos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function fetchProspectos(page: number) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (filterAsignado) params.set('asignadoA', filterAsignado);
    try {
      const res = await fetch(`/api/prospects?${params}`);
      const data = await res.json();
      setProspectos(data.prospectos || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
      setCurrentPage(page);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchProspectos(1);
  }

  function openAssign(p: Prospecto) {
    setAssigningProspecto(p);
    setAssignUserId(p.asignadoA || '');
    setObsInternas(p.observacionesInternas || '');
  }

  async function handleAssign() {
    if (!assigningProspecto) return;
    setAssignLoading(true);
    try {
      const res = await fetch(`/api/prospects/${assigningProspecto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignadoA: assignUserId || null, observacionesInternas: obsInternas }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      toast.success('Prospecto actualizado');
      setAssigningProspecto(null);
      fetchProspectos(currentPage);
    } catch {
      toast.error('Error al actualizar prospecto');
    } finally {
      setAssignLoading(false);
    }
  }

  function estadoBadgeVariant(estado: string | null): 'default' | 'warning' | 'success' | 'destructive' | 'info' | 'pending' {
    if (!estado) return 'default';
    const e = estado.toUpperCase();
    if (e === 'ASIGNADA') return 'warning';
    if (e === 'FINALIZADA') return 'success';
    if (e === 'CANCELADA') return 'destructive';
    return 'info';
  }

  function nombreUsuario(u: Usuario | null) {
    if (!u) return '—';
    return [u.nombre, u.apellidos].filter(Boolean).join(' ') || u.email;
  }

  if (!session) return <TableSkeleton cols={6} rows={10} showFilters />;

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prospectos</h1>
            <p className="text-muted-foreground text-sm">
              {total} prospecto{total !== 1 ? 's' : ''} {session.role !== 'admin' ? 'asignados a ti' : 'en total'}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, N° orden, cédula, teléfono..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline">Buscar</Button>
          </form>

          {session.role === 'admin' && (
            <Select
              value={filterAsignado}
              onChange={e => { setFilterAsignado(e.target.value); fetchProspectos(1); }}
              className="w-48"
            >
              <option value="">Todos</option>
              <option value="sin_asignar">Sin asignar</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{nombreUsuario(u)}</option>
              ))}
            </Select>
          )}
        </div>

        {/* Tabla */}
        {loading ? (
          <TableSkeleton cols={6} rows={10} />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>N° Orden</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Despacho</TableHead>
                  <TableHead>Tipo Orden</TableHead>
                  <TableHead>Estado</TableHead>
                  {session.role === 'admin' && <TableHead>Asignado a</TableHead>}
                  <TableHead className="w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospectos.length === 0 ? (
                  <TableEmptyState
                    colSpan={session.role === 'admin' ? 8 : 7}
                    message="No hay prospectos que coincidan"
                  />
                ) : (
                  prospectos.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <div>{p.cliente || '—'}</div>
                        <div className="text-xs text-muted-foreground">{p.idCliente || ''}</div>
                      </TableCell>
                      <TableCell className="text-sm">{p.nroOrden}</TableCell>
                      <TableCell className="text-sm">{p.telCelular || p.telOficina || '—'}</TableCell>
                      <TableCell className="text-sm">{p.despacho || '—'}</TableCell>
                      <TableCell className="text-sm">{p.tipoOrden || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={estadoBadgeVariant(p.estado)}>
                          {p.estado || '—'}
                        </Badge>
                      </TableCell>
                      {session.role === 'admin' && (
                        <TableCell className="text-sm">
                          {p.asignado ? (
                            <span className="text-foreground">{nombreUsuario(p.asignado)}</span>
                          ) : (
                            <span className="text-muted-foreground italic">Sin asignar</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingProspecto(p)}
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {session.role === 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAssign(p)}
                              title="Asignar"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => fetchProspectos(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => fetchProspectos(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog detalle */}
      {viewingProspecto && (
        <Dialog open onOpenChange={() => setViewingProspecto(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalle del Prospecto</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {([
                ['Cliente', viewingProspecto.cliente],
                ['N° Orden', viewingProspecto.nroOrden],
                ['ID Cliente', viewingProspecto.idCliente],
                ['Estado', viewingProspecto.estado],
                ['Prioridad', viewingProspecto.prioridad],
                ['Contrato', viewingProspecto.contrato],
                ['Contrato Ligado', viewingProspecto.contratoLigado],
                ['Tipo Orden', viewingProspecto.tipoOrden],
                ['Motivo', viewingProspecto.motivo],
                ['Técnico', viewingProspecto.tecnico],
                ['Usuario Creador', viewingProspecto.usuarioCreador],
                ['Usuario Envío', viewingProspecto.usuarioEnvio],
                ['Contacto', [viewingProspecto.contactoNombre, viewingProspecto.contactoApellido].filter(Boolean).join(' ')],
                ['Tel. Celular', viewingProspecto.telCelular],
                ['Tel. Instalación', viewingProspecto.telInstalacion],
                ['Tel. Oficina', viewingProspecto.telOficina],
                ['Email', viewingProspecto.email],
                ['Sucursal', viewingProspecto.sucursal],
                ['Despacho', viewingProspecto.despacho],
                ['Provincia', viewingProspecto.provincia],
                ['Cantón', viewingProspecto.canton],
                ['Distrito', viewingProspecto.distrito],
                ['Barrio', viewingProspecto.barrio],
                ['Dirección', viewingProspecto.direccion],
                ['Observaciones', viewingProspecto.observaciones],
                ['Bandera Cable', viewingProspecto.banderaCable],
                ['Bandera Internet', viewingProspecto.banderaInternet],
                ['Facturador', viewingProspecto.facturador],
                ['Tap', viewingProspecto.tap],
                ['Placa', viewingProspecto.placa],
                ['Poste', viewingProspecto.poste],
                ['Latitud', viewingProspecto.latitud],
                ['Longitud', viewingProspecto.longitud],
              ] as [string, string | null][]).map(([label, value]) => (
                <div key={label}>
                  <span className="font-medium text-muted-foreground">{label}</span>
                  <p className="mt-0.5">{value || '—'}</p>
                </div>
              ))}
              {viewingProspecto.observacionesInternas && (
                <div className="col-span-2">
                  <span className="font-medium text-muted-foreground">Observaciones Internas</span>
                  <p className="mt-0.5">{viewingProspecto.observacionesInternas}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog asignar */}
      {assigningProspecto && session.role === 'admin' && (
        <Dialog open onOpenChange={() => setAssigningProspecto(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Prospecto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Prospecto</p>
                <p className="text-sm text-muted-foreground">{assigningProspecto.cliente} — {assigningProspecto.nroOrden}</p>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Asignar a</label>
                <Select value={assignUserId} onChange={e => setAssignUserId(e.target.value)}>
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{nombreUsuario(u)}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Observaciones internas</label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                  rows={3}
                  value={obsInternas}
                  onChange={e => setObsInternas(e.target.value)}
                  placeholder="Notas internas sobre este prospecto..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssigningProspecto(null)}>Cancelar</Button>
              <Button onClick={handleAssign} disabled={assignLoading}>
                {assignLoading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
}
