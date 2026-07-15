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
import {
  Search,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Eye,
  Phone,
  AlertTriangle,
  Copy,
  Check,
  CheckCircle,
  MapPin,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatTel, formatCedula } from '@/lib/formatters';
import { nombreUsuario } from '@/lib/labels';

interface Usuario {
  id: string;
  nombre: string | null;
  apellidos: string | null;
  email: string;
}

interface ClienteConvertido {
  id: string;
  nombres: string;
  apellidos: string;
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
  asignadoAt: string | null;
  createdAt: string;
  metodoContacto: string | null;
  totalContactos: number;
  ultimoContacto: string | null;
  proveedorCompetidor: string | null;
}

// ── tipificaciones dinámicas desde DB ───────────────────────────────────────

type ResultadoContacto = string;

interface Tipificacion {
  id: string;
  valor: string;
  etiqueta: string;
  activa: boolean;
  orden: number;
  eliminaProspecto: boolean;
  creaCliente: boolean;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function tieneAlerta(p: Prospecto): boolean {
  if (!p.ultimoContacto) return true;
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  return new Date(p.ultimoContacto) < twoDaysAgo;
}

function diasSinContacto(p: Prospecto): number {
  if (!p.ultimoContacto) return 999;
  const diff = Date.now() - new Date(p.ultimoContacto).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ProspectsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [session, setSession] = useState<{ role: string; userId: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAsignado, setFilterAsignado] = useState('');
  const [filterTipificacion, setFilterTipificacion] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [viewingProspecto, setViewingProspecto] = useState<Prospecto | null>(null);
  const [clienteConvertido, setClienteConvertido] = useState<ClienteConvertido | null>(null);
  const [assigningProspecto, setAssigningProspecto] = useState<Prospecto | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [obsInternas, setObsInternas] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUserId, setBulkUserId] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const [tipificaciones, setTipificaciones] = useState<Tipificacion[]>([]);
  const [contactLoading, setContactLoading] = useState<string | null>(null);
  const [contactMetodo, setContactMetodo] = useState<ResultadoContacto | ''>('');
  const [contactProveedor, setContactProveedor] = useState('');
  const [contactObs, setContactObs] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sinCoberturaConfirm, setSinCoberturaConfirm] = useState(false);

  // Verificación de cobertura Claro fibra óptica
  const [coberturaStatus, setCoberturaStatus] = useState<'idle' | 'loading' | 'tiene' | 'no_tiene' | 'error'>('idle');


  // Inline obs editing state (for assigned agent in detail dialog)
  const [editingObs, setEditingObs] = useState(false);
  const [obsEditValue, setObsEditValue] = useState('');
  const [obsEditLoading, setObsEditLoading] = useState(false);

  const LIMIT = 15;

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) window.location.href = '/login'; return r.json(); })
      .then(d => setSession(d.user));
    fetch('/api/tipificaciones?soloActivas=true')
      .then(r => r.json())
      .then(d => setTipificaciones(d.tipificaciones || []));
  }, []);


  useEffect(() => {
    if (!session) return;
    if (session.role === 'admin') {
      fetch('/api/users').then(r => r.json()).then(d => setUsuarios(d.users || []));
    }
    fetchProspectos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function fetchProspectos(page: number, asignadoOverride?: string, tipificacionOverride?: string) {
    setSelectedIds(new Set());
    setLoading(true);
    const asignadoFilter = asignadoOverride !== undefined ? asignadoOverride : filterAsignado;
    const tipificacionFilter = tipificacionOverride !== undefined ? tipificacionOverride : filterTipificacion;
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (asignadoFilter) params.set('asignadoA', asignadoFilter);
    if (tipificacionFilter) params.set('metodoContacto', tipificacionFilter);
    try {
      const res = await fetch(`/api/prospects?${params}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(`Error: ${data.error || res.status} — ${data.detail || ''}`);
        return;
      }
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

  async function handleBulkAssign() {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch('/api/prospects/bulk-assign', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), asignadoA: bulkUserId || null }),
      });
      if (!res.ok) throw new Error('Error al asignar');
      const data = await res.json();
      toast.success(`${data.updated} prospecto${data.updated !== 1 ? 's' : ''} asignado${data.updated !== 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      setBulkUserId('');
      fetchProspectos(currentPage);
    } catch {
      toast.error('Error al asignar en bloque');
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleContactar(prospecto: Prospecto, resultado: ResultadoContacto, proveedor?: string, obs?: string) {
    setContactLoading(prospecto.id);
    try {
      const res = await fetch(`/api/prospects/${prospecto.id}/contactar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultado,
          ...(proveedor ? { proveedorCompetidor: proveedor } : {}),
          ...(obs ? { observacionesInternas: obs } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al registrar');
      }
      const data = await res.json();

      if (data.eliminado) {
        toast.success('Prospecto eliminado por sin cobertura.');
        setViewingProspecto(null);
        fetchProspectos(currentPage);
        return;
      }

      // Actualizar el dialog en tiempo real
      if (data.prospecto) {
        setViewingProspecto(prev => prev ? { ...prev, ...data.prospecto } : prev);
      }

      if (data.clienteCreado) {
        setClienteConvertido(data.clienteCreado);
        toast.success('¡Venta registrada! Cliente creado correctamente.');
      } else {
        toast.success(`Resultado registrado: ${getTipEtiqueta(resultado)}`);
      }

      fetchProspectos(currentPage);
    } catch {
      toast.error('Error al registrar contacto');
    } finally {
      setContactLoading(null);
    }
  }

  function copyToClipboard(value: string, key: string) {
    navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function handleSaveObs() {
    if (!viewingProspecto) return;
    setObsEditLoading(true);
    try {
      const res = await fetch(`/api/prospects/${viewingProspecto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observacionesInternas: obsEditValue }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      toast.success('Observaciones guardadas');
      setEditingObs(false);
      // Refresh list and update the viewed record
      fetchProspectos(currentPage);
      setViewingProspecto(prev => prev ? { ...prev, observacionesInternas: obsEditValue } : null);
    } catch {
      toast.error('Error al guardar observaciones');
    } finally {
      setObsEditLoading(false);
    }
  }

  async function checkCobertura(lat: string, lng: string) {
    setCoberturaStatus('loading');
    try {
      const res = await fetch(`/api/prospects/check-cobertura?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
      if (!res.ok) { setCoberturaStatus('error'); return; }
      const data = await res.json();
      setCoberturaStatus(data.tieneFibra ? 'tiene' : 'no_tiene');
    } catch {
      setCoberturaStatus('error');
    }
  }

  async function openDetalle(p: Prospecto) {
    setViewingProspecto(p);
    setClienteConvertido(null);
    setEditingObs(false);
    setContactMetodo('');
    setContactProveedor('');
    setContactObs('');
    setCoberturaStatus('idle');
    if (p.idCliente) {
      try {
        const res = await fetch(`/api/prospects/${p.id}`);
        if (res.ok) {
          const data = await res.json();
          setClienteConvertido(data.clienteConvertido || null);
        }
      } catch { /* silencioso */ }
    }
  }

  if (!session) return <TableSkeleton cols={7} rows={10} showFilters />;

  const isAssignedAgent = (p: Prospecto) =>
    session.role !== 'admin' && p.asignadoA === session.userId;

  function getTipEtiqueta(valor: string | null | undefined): string {
    if (!valor) return '—';
    return tipificaciones.find(t => t.valor === valor)?.etiqueta ?? valor;
  }

  function getSelectedTip(): Tipificacion | undefined {
    return tipificaciones.find(t => t.valor === contactMetodo);
  }

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prospectos</h1>
            <p className="text-muted-foreground text-sm hidden sm:block">
              {total} prospecto{total !== 1 ? 's' : ''}{' '}
              {session.role !== 'admin' ? 'asignados a ti' : 'en total'}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_auto] sm:gap-3">
          {/* Búsqueda — ocupa todo en móvil, flex-1 en desktop */}
          <form onSubmit={handleSearch} className="col-span-2 sm:col-span-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, cédula, teléfono..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline" className="shrink-0">
              <Search className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Buscar</span>
            </Button>
          </form>

          {session.role === 'admin' && (
            <Select
              value={filterAsignado}
              onChange={e => { const v = e.target.value; setFilterAsignado(v); fetchProspectos(1, v); }}
              className="col-span-1 sm:w-48"
            >
              <option value="">Agente: todos</option>
              <option value="sin_asignar">Sin asignar</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{nombreUsuario(u)}</option>
              ))}
            </Select>
          )}

          <Select
            value={filterTipificacion}
            onChange={e => { const v = e.target.value; setFilterTipificacion(v); fetchProspectos(1, undefined, v); }}
            className="col-span-1 sm:w-56"
          >
            <option value="">Tipificación: todas</option>
            {tipificaciones.map(t => (
              <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
            ))}
          </Select>
        </div>

        {/* Lista */}
        {loading ? (
          <TableSkeleton cols={session.role === 'admin' ? 6 : 4} rows={10} />
        ) : (
          <>
            {/* Vista cards — móvil */}
            <div className="sm:hidden space-y-2">
              {prospectos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No hay prospectos que coincidan</p>
              ) : prospectos.map(p => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 ${tieneAlerta(p) && p.asignadoA ? 'border-destructive/40 bg-red-50/30 dark:bg-red-950/10' : ''}`}
                >
                  {session.role === 'admin' && (
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-primary flex-shrink-0"
                      checked={selectedIds.has(p.id)}
                      onChange={e => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) next.add(p.id);
                        else next.delete(p.id);
                        setSelectedIds(next);
                      }}
                    />
                  )}
                  {/* Avatar inicial */}
                  <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {(p.cliente || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.cliente || '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatTel(p.telCelular) || '—'} · {p.provincia || '—'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone className={`h-3 w-3 ${p.metodoContacto ? 'text-muted-foreground' : 'text-muted-foreground/40'}`} />
                      <span className="text-xs tabular-nums">{p.totalContactos}</span>
                      {tieneAlerta(p) && p.asignadoA && (
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                      )}
                      {session.role === 'admin' && p.asignado && (
                        <span className="text-xs text-muted-foreground truncate">· {nombreUsuario(p.asignado)}</span>
                      )}
                    </div>
                  </div>
                  {/* Acciones */}
                  <div className="flex gap-0.5 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openDetalle(p)} title="Ver detalle" className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {session.role === 'admin' && (
                      <Button variant="ghost" size="sm" onClick={() => openAssign(p)} title="Asignar" className="h-8 w-8 p-0">
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Vista tabla — desktop */}
            <div className="hidden sm:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {session.role === 'admin' && (
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-primary"
                          checked={prospectos.length > 0 && prospectos.every(p => selectedIds.has(p.id))}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedIds(new Set(prospectos.map(p => p.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                        />
                      </TableHead>
                    )}
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tel. Celular</TableHead>
                    <TableHead>Provincia</TableHead>
                    <TableHead>Contactos</TableHead>
                    {session.role === 'admin' && <TableHead>Asignado a</TableHead>}
                    <TableHead>Fecha asignado</TableHead>
                    <TableHead className="w-28">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prospectos.length === 0 ? (
                    <TableEmptyState
                      colSpan={session.role === 'admin' ? 8 : 6}
                      message="No hay prospectos que coincidan"
                    />
                  ) : (
                    prospectos.map(p => (
                      <TableRow
                        key={p.id}
                        className={tieneAlerta(p) && p.asignadoA ? 'bg-red-50/50 dark:bg-red-950/10' : ''}
                      >
                        {session.role === 'admin' && (
                          <TableCell className="w-10">
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer accent-primary"
                              checked={selectedIds.has(p.id)}
                              onChange={e => {
                                const next = new Set(selectedIds);
                                if (e.target.checked) next.add(p.id);
                                else next.delete(p.id);
                                setSelectedIds(next);
                              }}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          <div>{p.cliente || '—'}</div>
                          <div className="text-xs text-muted-foreground">{formatCedula(p.idCliente) || ''}</div>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{formatTel(p.telCelular) || '—'}</TableCell>
                        <TableCell className="text-sm">{p.provincia || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {p.metodoContacto ? (
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <Phone className="h-3.5 w-3.5 text-muted-foreground/40" />
                            )}
                            <span className="text-sm tabular-nums">{p.totalContactos}</span>
                            {tieneAlerta(p) && p.asignadoA && (
                              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                            )}
                          </div>
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
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {p.asignadoAt
                            ? new Date(p.asignadoAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openDetalle(p)} title="Ver detalle">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {session.role === 'admin' && (
                              <Button variant="ghost" size="sm" onClick={() => openAssign(p)} title="Asignar">
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
          </>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => fetchProspectos(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Anterior</span>
              </Button>
              <span className="sm:hidden text-xs text-muted-foreground self-center">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => fetchProspectos(currentPage + 1)}
              >
                <span className="hidden sm:inline mr-1">Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Barra flotante de selección en bloque (admin) ───────────────────── */}
      {session.role === 'admin' && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border bg-background shadow-lg px-4 py-3">
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <Select
            value={bulkUserId}
            onChange={e => setBulkUserId(e.target.value)}
            className="w-48"
          >
            <option value="">Sin asignar</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>{nombreUsuario(u)}</option>
            ))}
          </Select>
          <Button
            size="sm"
            onClick={handleBulkAssign}
            disabled={bulkLoading}
          >
            {bulkLoading ? 'Asignando...' : 'Asignar'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
            disabled={bulkLoading}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* ── Dialog: Detalle ───────────────────────────────────────────────────── */}
      {viewingProspecto && (
        <Dialog open onOpenChange={() => setViewingProspecto(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalle del Prospecto</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              {/* Alert banner */}
              {tieneAlerta(viewingProspecto) && viewingProspecto.asignadoA && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-destructive text-xs font-medium">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Sin contacto hace{' '}
                    {diasSinContacto(viewingProspecto) === 999
                      ? 'más de 2 días'
                      : `${diasSinContacto(viewingProspecto)} días`}
                    . Se recomienda contactar al prospecto.
                  </span>
                </div>
              )}

              {/* Sección: Cliente */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Cliente
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <CopyField label="Cliente" value={viewingProspecto.cliente} fieldKey="nombre" copiedField={copiedField} onCopy={copyToClipboard} />
                  <CopyField label="ID / Cédula" value={formatCedula(viewingProspecto.idCliente)} fieldKey="idCliente" copiedField={copiedField} onCopy={copyToClipboard} />
                </div>
              </div>

              <hr className="border-border" />

              {/* Sección: Contacto */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Contacto
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <CopyField label="Tel. Celular" value={formatTel(viewingProspecto.telCelular)} fieldKey="telCelular" copiedField={copiedField} onCopy={copyToClipboard} />
                  <CopyField label="Tel. Instalación" value={formatTel(viewingProspecto.telInstalacion)} fieldKey="telInstalacion" copiedField={copiedField} onCopy={copyToClipboard} />
                  <CopyField label="Tel. Oficina" value={formatTel(viewingProspecto.telOficina)} fieldKey="telOficina" copiedField={copiedField} onCopy={copyToClipboard} />
                  <CopyField label="Email" value={viewingProspecto.email} fieldKey="email" copiedField={copiedField} onCopy={copyToClipboard} />
                </div>
              </div>

              <hr className="border-border" />

              {/* Sección: Ubicación */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Ubicación
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <DetailField label="Provincia" value={viewingProspecto.provincia} />
                  <DetailField label="Cantón" value={viewingProspecto.canton} />
                  <DetailField label="Distrito" value={viewingProspecto.distrito} />
                  <CopyField label="Dirección" value={viewingProspecto.direccion} fieldKey="direccion" copiedField={copiedField} onCopy={copyToClipboard} />
                </div>

                {(viewingProspecto.latitud || viewingProspecto.longitud) && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground">Coordenadas</span>
                        <p className="mt-0.5 font-mono text-xs">
                          {viewingProspecto.latitud || '—'}, {viewingProspecto.longitud || '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {viewingProspecto.latitud && viewingProspecto.longitud && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => checkCobertura(viewingProspecto.latitud!, viewingProspecto.longitud!)}
                              disabled={coberturaStatus === 'loading'}
                              title="Verificar cobertura fibra óptica Claro"
                            >
                              {coberturaStatus === 'loading' ? '⏳' : '📡'} Fibra
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              title="Ver en mapa Claro (coordenadas copiadas al portapapeles)"
                              onClick={() => {
                                navigator.clipboard.writeText(`${viewingProspecto.latitud}, ${viewingProspecto.longitud}`);
                                window.open('https://www.claro.cr/mapacobertura/', '_blank', 'noopener');
                              }}
                            >
                              <MapPin className="h-3.5 w-3.5 mr-1" /> Claro
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() =>
                                copyToClipboard(
                                  `${viewingProspecto.latitud}, ${viewingProspecto.longitud}`,
                                  'coords',
                                )
                              }
                              title="Copiar coordenadas"
                            >
                              {copiedField === 'coords' ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {coberturaStatus !== 'idle' && coberturaStatus !== 'loading' && (
                      <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${
                        coberturaStatus === 'tiene'
                          ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                          : coberturaStatus === 'no_tiene'
                          ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                          : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
                      }`}>
                        {coberturaStatus === 'tiene' && '✅ Cobertura de fibra óptica disponible (Claro)'}
                        {coberturaStatus === 'no_tiene' && '❌ Sin cobertura de fibra óptica (Claro)'}
                        {coberturaStatus === 'error' && '⚠️ No se pudo verificar la cobertura'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <hr className="border-border" />

              {/* Registrar contacto — solo agente asignado */}
                <>
                  <hr className="border-border" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Registrar contacto
                    </p>
                    {(() => {
                      const tipSeleccionada = getSelectedTip();
                      const esOtroProveedor = !!tipSeleccionada && tipSeleccionada.etiqueta.toLowerCase().includes('otro proveedor');
                      const puedeRegistrar = !!contactMetodo && (!esOtroProveedor || (!!contactProveedor && !!contactObs.trim()));
                      return (
                        <div className="space-y-2">
                          <div className="flex gap-2 items-center">
                            <Select
                              value={contactMetodo}
                              onChange={e => { setContactMetodo(e.target.value as ResultadoContacto); setContactProveedor(''); setContactObs(''); }}
                              className="flex-1"
                            >
                              <option value="" disabled>— Seleccione —</option>
                              {tipificaciones.map(t => (
                                <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
                              ))}
                            </Select>
                            <Button
                              onClick={() => {
                                const tip = getSelectedTip();
                                if (tip?.eliminaProspecto) {
                                  setSinCoberturaConfirm(true);
                                } else {
                                  handleContactar(viewingProspecto, contactMetodo as ResultadoContacto, esOtroProveedor ? contactProveedor : undefined, esOtroProveedor ? contactObs : undefined);
                                }
                              }}
                              disabled={!puedeRegistrar || contactLoading === viewingProspecto.id}
                              className="flex-shrink-0"
                            >
                              {contactLoading === viewingProspecto.id ? 'Guardando...' : 'Registrar'}
                            </Button>
                          </div>
                          {esOtroProveedor && (
                            <>
                              <Select
                                value={contactProveedor}
                                onChange={e => setContactProveedor(e.target.value)}
                                className="w-full"
                              >
                                <option value="" disabled>— Seleccione proveedor *</option>
                                {['TIGO', 'LIBERTY', 'METROCOM', 'TELECABLE', 'KOLBI', 'STARLINK', 'OTRO'].map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </Select>
                              <textarea
                                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                rows={2}
                                value={contactObs}
                                onChange={e => setContactObs(e.target.value)}
                                placeholder="Observaciones requeridas *"
                              />
                            </>
                          )}
                        </div>
                      );
                    })()}
                    {viewingProspecto.totalContactos > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {viewingProspecto.totalContactos} contacto{viewingProspecto.totalContactos !== 1 ? 's' : ''} registrado{viewingProspecto.totalContactos !== 1 ? 's' : ''} · Último:{' '}
                        {viewingProspecto.ultimoContacto
                          ? new Date(viewingProspecto.ultimoContacto).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                        {viewingProspecto.metodoContacto && (
                          <> · {getTipEtiqueta(viewingProspecto.metodoContacto)}</>
                        )}
                      </p>
                    )}
                  </div>
                </>

              {/* Sección: Gestión */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Gestión
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <DetailField
                    label="Asignado a"
                    value={viewingProspecto.asignado ? nombreUsuario(viewingProspecto.asignado) : null}
                  />
                  <DetailField
                    label="Total contactos"
                    value={String(viewingProspecto.totalContactos)}
                  />
                  {viewingProspecto.proveedorCompetidor && (
                    <DetailField
                      label="Proveedor competidor"
                      value={viewingProspecto.proveedorCompetidor}
                    />
                  )}
                  <div>
                    <span className="text-xs text-muted-foreground">Último contacto</span>
                    <p className="mt-0.5">
                      {viewingProspecto.ultimoContacto
                        ? new Date(viewingProspecto.ultimoContacto).toLocaleDateString('es-CR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                      {viewingProspecto.ultimoContacto && viewingProspecto.metodoContacto && (
                        <span className="ml-1.5 text-muted-foreground text-xs">
                          {getTipEtiqueta(viewingProspecto.metodoContacto)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Cliente convertido */}
                {clienteConvertido && (
                  <div className="mt-3 flex items-center justify-between rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Convertido: <strong>{clienteConvertido.nombres} {clienteConvertido.apellidos}</strong>
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 gap-1 flex-shrink-0"
                      onClick={() => router.push(`/clients?search=${encodeURIComponent(viewingProspecto.idCliente || '')}`)}
                    >
                      Ver cliente <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Observaciones internas */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Observaciones internas</span>
                    {/* Show edit button for the assigned agent or admin */}
                    {(session.role === 'admin' ||
                      viewingProspecto.asignadoA === session.userId) &&
                      !editingObs && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => {
                            setObsEditValue(viewingProspecto.observacionesInternas || '');
                            setEditingObs(true);
                          }}
                        >
                          Editar
                        </Button>
                      )}
                  </div>

                  {editingObs ? (
                    <div className="space-y-2">
                      <textarea
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        rows={3}
                        value={obsEditValue}
                        onChange={e => setObsEditValue(e.target.value)}
                        placeholder="Notas internas sobre este prospecto..."
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingObs(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveObs}
                          disabled={obsEditLoading}
                        >
                          {obsEditLoading ? 'Guardando...' : 'Guardar'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap">
                      {viewingProspecto.observacionesInternas || (
                        <span className="text-muted-foreground italic">Sin observaciones</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Dialog: Confirmar Sin Cobertura ─────────────────────────────────── */}
      {sinCoberturaConfirm && viewingProspecto && (
        <Dialog open onOpenChange={() => setSinCoberturaConfirm(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>¿Eliminar prospecto?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Al registrar <strong>{getTipEtiqueta(contactMetodo)}</strong>, el prospecto{' '}
              <strong>{viewingProspecto.cliente}</strong> será eliminado permanentemente de la base de datos.
              Esta acción no se puede deshacer.
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setSinCoberturaConfirm(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={contactLoading === viewingProspecto.id}
                onClick={() => {
                  setSinCoberturaConfirm(false);
                  handleContactar(viewingProspecto, contactMetodo as ResultadoContacto, contactProveedor || undefined, contactObs || undefined);
                }}
              >
                Sí, eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Dialog: Asignar ──────────────────────────────────────────────────── */}
      {assigningProspecto && session.role === 'admin' && (
        <Dialog open onOpenChange={() => setAssigningProspecto(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Prospecto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Prospecto</p>
                <p className="text-sm text-muted-foreground">
                  {assigningProspecto.cliente} — {assigningProspecto.nroOrden}
                </p>
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
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                  value={obsInternas}
                  onChange={e => setObsInternas(e.target.value)}
                  placeholder="Notas internas sobre este prospecto..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssigningProspecto(null)}>
                Cancelar
              </Button>
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="mt-0.5">{value || '—'}</p>
    </div>
  );
}

function CopyField({
  label,
  value,
  fieldKey,
  copiedField,
  onCopy,
}: {
  label: string;
  value: string | null | undefined;
  fieldKey: string;
  copiedField: string | null;
  onCopy: (value: string, key: string) => void;
}) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-0.5 flex items-center gap-1.5">
        <span>{value || '—'}</span>
        {value && (
          <button
            onClick={() => onCopy(value, fieldKey)}
            className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-accent transition-colors cursor-pointer"
            title={`Copiar ${label}`}
            type="button"
          >
            {copiedField === fieldKey ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
