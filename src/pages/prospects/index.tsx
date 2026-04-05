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
  MessageCircle,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
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
  metodoContacto: string | null;
  totalContactos: number;
  ultimoContacto: string | null;
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

function estadoBadgeVariant(
  estado: string | null,
): 'default' | 'warning' | 'success' | 'destructive' | 'info' | 'pending' {
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

// ── component ─────────────────────────────────────────────────────────────────

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

  const [contactLoading, setContactLoading] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Inline obs editing state (for assigned agent in detail dialog)
  const [editingObs, setEditingObs] = useState(false);
  const [obsEditValue, setObsEditValue] = useState('');
  const [obsEditLoading, setObsEditLoading] = useState(false);

  const LIMIT = 15;

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) window.location.href = '/login'; return r.json(); })
      .then(d => setSession(d.user));
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

  async function handleContactar(prospecto: Prospecto, metodo: 'LLAMADA' | 'WHATSAPP') {
    setContactLoading(prospecto.id);
    try {
      const res = await fetch(`/api/prospects/${prospecto.id}/contactar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metodo }),
      });
      if (!res.ok) throw new Error('Error al registrar');
      toast.success(`Contacto por ${metodo === 'LLAMADA' ? 'llamada' : 'WhatsApp'} registrado`);
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

  if (!session) return <TableSkeleton cols={7} rows={10} showFilters />;

  const isAssignedAgent = (p: Prospecto) =>
    session.role !== 'admin' && p.asignadoA === session.userId;

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prospectos</h1>
            <p className="text-muted-foreground text-sm">
              {total} prospecto{total !== 1 ? 's' : ''}{' '}
              {session.role !== 'admin' ? 'asignados a ti' : 'en total'}
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
          <TableSkeleton cols={session.role === 'admin' ? 7 : 6} rows={10} />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>N° Orden</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Contactos</TableHead>
                  {session.role === 'admin' && <TableHead>Asignado a</TableHead>}
                  <TableHead className="w-28">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospectos.length === 0 ? (
                  <TableEmptyState
                    colSpan={session.role === 'admin' ? 7 : 6}
                    message="No hay prospectos que coincidan"
                  />
                ) : (
                  prospectos.map(p => (
                    <TableRow
                      key={p.id}
                      className={
                        tieneAlerta(p) && p.asignadoA
                          ? 'bg-red-50/50 dark:bg-red-950/10'
                          : ''
                      }
                    >
                      {/* Cliente */}
                      <TableCell className="font-medium">
                        <div>{p.cliente || '—'}</div>
                        <div className="text-xs text-muted-foreground">{p.idCliente || ''}</div>
                      </TableCell>

                      {/* N° Orden */}
                      <TableCell className="text-sm font-mono">{p.nroOrden}</TableCell>

                      {/* Teléfono */}
                      <TableCell className="text-sm">{p.telCelular || p.telOficina || '—'}</TableCell>

                      {/* Estado */}
                      <TableCell>
                        <Badge variant={estadoBadgeVariant(p.estado)}>
                          {p.estado || '—'}
                        </Badge>
                      </TableCell>

                      {/* Contactos */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {p.metodoContacto === 'LLAMADA' ? (
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : p.metodoContacto === 'WHATSAPP' ? (
                            <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Phone className="h-3.5 w-3.5 text-muted-foreground/40" />
                          )}
                          <span className="text-sm tabular-nums">{p.totalContactos}</span>
                          {tieneAlerta(p) && p.asignadoA && (
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                          )}
                        </div>
                      </TableCell>

                      {/* Asignado a (admin only) */}
                      {session.role === 'admin' && (
                        <TableCell className="text-sm">
                          {p.asignado ? (
                            <span className="text-foreground">{nombreUsuario(p.asignado)}</span>
                          ) : (
                            <span className="text-muted-foreground italic">Sin asignar</span>
                          )}
                        </TableCell>
                      )}

                      {/* Acciones */}
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewingProspecto(p);
                              setEditingObs(false);
                            }}
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Contact buttons — only for assigned agent */}
                          {isAssignedAgent(p) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleContactar(p, 'LLAMADA')}
                                disabled={contactLoading === p.id}
                                title="Registrar llamada"
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleContactar(p, 'WHATSAPP')}
                                disabled={contactLoading === p.id}
                                title="Registrar WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {/* Assign button — admin only */}
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
                  <DetailField label="Nombre" value={viewingProspecto.cliente} />
                  <DetailField label="ID Cliente" value={viewingProspecto.idCliente} />
                  <div>
                    <span className="text-xs text-muted-foreground">Estado</span>
                    <div className="mt-0.5">
                      <Badge variant={estadoBadgeVariant(viewingProspecto.estado)}>
                        {viewingProspecto.estado || '—'}
                      </Badge>
                    </div>
                  </div>
                  <DetailField label="Prioridad" value={viewingProspecto.prioridad} />
                </div>
              </div>

              <hr className="border-border" />

              {/* Sección: Contacto */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Contacto
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <CopyField
                    label="Tel. Celular"
                    value={viewingProspecto.telCelular}
                    fieldKey="telCelular"
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                  <CopyField
                    label="Tel. Instalación"
                    value={viewingProspecto.telInstalacion}
                    fieldKey="telInstalacion"
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                  <CopyField
                    label="Tel. Oficina"
                    value={viewingProspecto.telOficina}
                    fieldKey="telOficina"
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                  <CopyField
                    label="Email"
                    value={viewingProspecto.email}
                    fieldKey="email"
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
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
                  <DetailField label="Dirección" value={viewingProspecto.direccion} />
                </div>

                {(viewingProspecto.latitud || viewingProspecto.longitud) && (
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground">Coordenadas</span>
                      <p className="mt-0.5 font-mono text-xs">
                        {viewingProspecto.latitud || '—'}, {viewingProspecto.longitud || '—'}
                      </p>
                    </div>
                    {viewingProspecto.latitud && viewingProspecto.longitud && (
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
                    )}
                  </div>
                )}
              </div>

              <hr className="border-border" />

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
                        <span className="ml-1.5 inline-flex items-center gap-1 text-muted-foreground">
                          {viewingProspecto.metodoContacto === 'LLAMADA' ? (
                            <Phone className="h-3 w-3" />
                          ) : (
                            <MessageCircle className="h-3 w-3" />
                          )}
                          {viewingProspecto.metodoContacto}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

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
