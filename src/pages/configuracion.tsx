import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Select } from '@/components/ui/select';
import { Plus, Edit, Trash2, Mail, Users, Target, ChevronLeft, ChevronRight, List, ArrowUp, ArrowDown, Check, X, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DEFAULT_META = 8;

interface User {
  id: string;
  email: string;
  nombre: string | null;
  apellidos: string | null;
  role: string;
  password: string | null;
  inviteToken: string | null;
  createdAt: string;
}

interface KpiGlobal { periodo: string; meta: number; }
interface KpiUser   { userId: string; periodo: string; meta: number; }

function displayName(u: User) {
  return u.nombre && u.apellidos ? `${u.nombre} ${u.apellidos}` : u.email;
}

// ── Tab Usuarios ─────────────────────────────────────────────────────────────

function TabUsuarios({ users, onRefresh }: { users: User[]; onRefresh: () => void }) {
  const [inviteOpen, setInviteOpen]     = useState(false);
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError]   = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const [editOpen, setEditOpen]         = useState(false);
  const [editUser, setEditUser]         = useState<User | null>(null);
  const [newPass, setNewPass]           = useState('');
  const [confirmPass, setConfirmPass]   = useState('');
  const [editLoading, setEditLoading]   = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true); setInviteError('');
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error || 'Error'); return; }
      setInviteSuccess(true);
      setInviteEmail('');
      onRefresh();
      setTimeout(() => { setInviteOpen(false); setInviteSuccess(false); }, 2000);
    } catch { setInviteError('Error al procesar'); }
    finally { setInviteLoading(false); }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    if (!newPass || newPass.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    if (newPass !== confirmPass) { toast.error('Las contraseñas no coinciden'); return; }
    setEditLoading(true);
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPass }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Error'); return; }
      toast.success('Contraseña actualizada');
      setEditOpen(false); setEditUser(null); setNewPass(''); setConfirmPass('');
    } catch { toast.error('Error al procesar'); }
    finally { setEditLoading(false); }
  }

  async function handleDelete(user: User) {
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Usuario eliminado'); onRefresh(); }
    else { const d = await res.json(); toast.error(d.error || 'Error'); }
    setDeleteConfirm(null);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{users.length} usuario(s) registrado(s)</p>
        <Button onClick={() => { setInviteOpen(true); setInviteError(''); setInviteSuccess(false); }}>
          <Mail className="mr-2 h-4 w-4" /> Invitar usuario
        </Button>
      </div>

      {/* Cards — móvil */}
      <div className="sm:hidden space-y-2">
        {users.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No hay usuarios registrados</p>
        ) : users.map(u => (
          <div key={u.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {(u.nombre || u.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName(u)}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {u.password ? (
                  <Badge variant="success" className="text-[10px] px-1.5 py-0">Activo</Badge>
                ) : u.inviteToken ? (
                  <Badge variant="warning" className="text-[10px] px-1.5 py-0">Pendiente</Badge>
                ) : (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">Inactivo</Badge>
                )}
                <Badge variant={u.role === 'admin' ? 'info' : 'default'} className="text-[10px] px-1.5 py-0 capitalize">
                  {u.role}
                </Badge>
              </div>
            </div>
            <div className="flex gap-0.5 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar contraseña"
                onClick={() => { setEditUser(u); setNewPass(''); setConfirmPass(''); setEditOpen(true); }}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Eliminar"
                onClick={() => setDeleteConfirm(u)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla — desktop */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableEmptyState colSpan={6} message="No hay usuarios registrados" />
              ) : users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{displayName(u)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  <TableCell>
                    {u.password ? (
                      <Badge variant="success">Activo</Badge>
                    ) : u.inviteToken ? (
                      <Badge variant="warning">Invitación pendiente</Badge>
                    ) : (
                      <Badge variant="default">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'info' : 'default'} className="capitalize">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Editar contraseña"
                        onClick={() => { setEditUser(u); setNewPass(''); setConfirmPass(''); setEditOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Eliminar"
                        onClick={() => setDeleteConfirm(u)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invitar */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar usuario</DialogTitle>
            <DialogDescription>Se enviará un correo con el enlace de activación.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            {inviteError && <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{inviteError}</p>}
            {inviteSuccess && <p className="text-sm text-green-600 bg-green-500/10 rounded-md p-3">¡Invitación enviada!</p>}
            <div>
              <label className="text-sm font-medium block mb-1">Email</label>
              <Input type="email" placeholder="usuario@ejemplo.com" value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)} required disabled={inviteLoading || inviteSuccess} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)} disabled={inviteLoading}>Cancelar</Button>
              <Button type="submit" disabled={inviteLoading || inviteSuccess}>
                {inviteLoading ? 'Enviando...' : inviteSuccess ? 'Enviado ✓' : 'Enviar invitación'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Editar contraseña */}
      {editOpen && editUser && (
        <Dialog open onOpenChange={() => setEditOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar contraseña</DialogTitle>
              <DialogDescription>{displayName(editUser)}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Nueva contraseña</label>
                <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Confirmar contraseña</label>
                <Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={editLoading}>{editLoading ? 'Guardando...' : 'Guardar'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmar eliminación */}
      {deleteConfirm && (
        <Dialog open onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>¿Eliminar usuario?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Se eliminará a <strong>{displayName(deleteConfirm)}</strong> permanentemente.
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>Eliminar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ── Tab Metas KPI ─────────────────────────────────────────────────────────────

function TabMetasKPI({ vendors }: { vendors: User[] }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [globales, setGlobales] = useState<KpiGlobal[]>([]);
  const [porUsuario, setPorUsuario] = useState<KpiUser[]>([]);
  const [editingCell, setEditingCell] = useState<{ mes: number; userId: string | null } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMetas = useCallback(async () => {
    const res = await fetch(`/api/kpi-meta?year=${year}`);
    if (res.ok) {
      const data = await res.json();
      setGlobales(data.globales ?? []);
      setPorUsuario(data.porUsuario ?? []);
    }
  }, [year]);

  useEffect(() => { fetchMetas(); }, [fetchMetas]);

  function getGlobal(mes: number): number {
    const p = `${year}-${String(mes).padStart(2, '0')}`;
    return globales.find(g => g.periodo === p)?.meta ?? DEFAULT_META;
  }

  function getUserMeta(mes: number, userId: string): number | null {
    const p = `${year}-${String(mes).padStart(2, '0')}`;
    return porUsuario.find(k => k.userId === userId && k.periodo === p)?.meta ?? null;
  }

  function startEdit(mes: number, userId: string | null) {
    const current = userId ? (getUserMeta(mes, userId) ?? getGlobal(mes)) : getGlobal(mes);
    setEditingCell({ mes, userId });
    setEditValue(String(current));
  }

  async function saveCell() {
    if (!editingCell) return;
    const value = parseInt(editValue);
    if (isNaN(value) || value < 0) { toast.error('Valor inválido'); return; }
    setSaving(true);
    try {
      const periodo = `${year}-${String(editingCell.mes).padStart(2, '0')}`;
      const body: Record<string, unknown> = { periodo, meta: value };
      if (editingCell.userId) body.userId = editingCell.userId;
      const res = await fetch('/api/kpi-meta', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      await fetchMetas();
      setEditingCell(null);
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  }

  const currentMonth = new Date().getFullYear() === year ? new Date().getMonth() + 1 : 12;
  const mesesVisibles = Array.from({ length: currentMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Selector de año */}
      <div className="flex items-center gap-2">
        <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-md hover:bg-accent transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold w-12 text-center">{year}</span>
        <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded-md hover:bg-accent transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
          Haz clic en cualquier celda para editar. La columna <strong>Global</strong> aplica a todos los que no tengan meta individual.
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-28">Mes</th>
              <th className="px-4 py-3 text-center font-semibold w-24">
                <span className="flex items-center justify-center gap-1">
                  <Target className="h-3.5 w-3.5 text-primary" /> Global
                </span>
              </th>
              {vendors.map(v => (
                <th key={v.id} className="px-4 py-3 text-center font-medium min-w-[120px]">
                  <div className="truncate max-w-[120px] mx-auto">{displayName(v)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mesesVisibles.map(mes => {
              const globalVal = getGlobal(mes);
              return (
                <tr key={mes} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-muted-foreground">{MESES[mes - 1]}</td>

                  {/* Celda global */}
                  <td className="px-2 py-1.5 text-center">
                    {editingCell?.mes === mes && editingCell.userId === null ? (
                      <input
                        type="number" min={0}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={saveCell}
                        onKeyDown={e => { if (e.key === 'Enter') saveCell(); if (e.key === 'Escape') setEditingCell(null); }}
                        className="w-16 text-center rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                        disabled={saving}
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(mes, null)}
                        className="w-16 rounded px-2 py-1 text-center font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                      >
                        {globalVal}
                      </button>
                    )}
                  </td>

                  {/* Celdas por usuario */}
                  {vendors.map(v => {
                    const userVal = getUserMeta(mes, v.id);
                    const isEditing = editingCell?.mes === mes && editingCell.userId === v.id;
                    const isCustom = userVal !== null;
                    return (
                      <td key={v.id} className="px-2 py-1.5 text-center">
                        {isEditing ? (
                          <input
                            type="number" min={0}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={saveCell}
                            onKeyDown={e => { if (e.key === 'Enter') saveCell(); if (e.key === 'Escape') setEditingCell(null); }}
                            className="w-16 text-center rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            autoFocus
                            disabled={saving}
                          />
                        ) : (
                          <button
                            onClick={() => startEdit(mes, v.id)}
                            className={cn(
                              'w-16 rounded px-2 py-1 text-center transition-colors',
                              isCustom
                                ? 'font-semibold bg-secondary hover:bg-secondary/80'
                                : 'text-muted-foreground hover:bg-muted'
                            )}
                            title={isCustom ? 'Meta personalizada' : `Usa global (${globalVal})`}
                          >
                            {isCustom ? userVal : '—'}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Valores en <span className="font-semibold text-primary">azul</span> = meta global del mes ·
        Valores en <span className="font-semibold">gris oscuro</span> = meta personalizada del usuario ·
        <span className="text-muted-foreground"> — </span> = usa la meta global
      </p>
    </div>
  );
}

// ── Tab Tipificaciones ────────────────────────────────────────────────────────

interface Tipificacion {
  id: string;
  valor: string;
  etiqueta: string;
  activa: boolean;
  orden: number;
  eliminaProspecto: boolean;
  creaCliente: boolean;
}

function TabTipificaciones() {
  const [tips, setTips] = useState<Tipificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEtiqueta, setEditEtiqueta] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Tipificacion | null>(null);
  const [newEtiqueta, setNewEtiqueta] = useState('');
  const [newEliminaProspecto, setNewEliminaProspecto] = useState(false);
  const [newCreaCliente, setNewCreaCliente] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  async function fetchTips() {
    setLoading(true);
    try {
      const res = await fetch('/api/tipificaciones');
      if (res.ok) {
        const data = await res.json();
        setTips(data.tipificaciones ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTips(); }, []);

  async function patch(id: string, body: Record<string, unknown>) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/tipificaciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      await fetchTips();
    } catch { toast.error('Error al guardar'); }
    finally { setSavingId(null); }
  }

  async function saveEtiqueta(id: string) {
    if (!editEtiqueta.trim()) return;
    await patch(id, { etiqueta: editEtiqueta });
    setEditingId(null);
  }

  async function moveOrden(tip: Tipificacion, dir: 1 | -1) {
    const idx = tips.indexOf(tip);
    const swapWith = tips[idx + dir];
    if (!swapWith) return;
    await Promise.all([
      patch(tip.id, { orden: swapWith.orden }),
      patch(swapWith.id, { orden: tip.orden }),
    ]);
  }

  async function handleDelete(tip: Tipificacion) {
    const res = await fetch(`/api/tipificaciones/${tip.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Tipificación eliminada'); await fetchTips(); }
    else { const d = await res.json(); toast.error(d.error || 'Error'); }
    setDeleteConfirm(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newEtiqueta.trim()) return;
    setAddLoading(true);
    try {
      const res = await fetch('/api/tipificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etiqueta: newEtiqueta.trim(), eliminaProspecto: newEliminaProspecto, creaCliente: newCreaCliente }),
      });
      if (!res.ok) throw new Error();
      toast.success('Tipificación creada');
      setNewEtiqueta(''); setNewEliminaProspecto(false); setNewCreaCliente(false);
      setAddOpen(false);
      await fetchTips();
    } catch { toast.error('Error al crear'); }
    finally { setAddLoading(false); }
  }

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{tips.length} tipificación(es)</p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nueva tipificación
        </Button>
      </div>

      {/* Cards — móvil */}
      <div className="sm:hidden space-y-2">
        {tips.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No hay tipificaciones</p>
        ) : tips.map((t, idx) => (
          <div key={t.id} className={`rounded-lg border bg-card px-3 py-2.5 ${!t.activa ? 'opacity-50' : ''}`}>
            <div className="flex items-start gap-2">
              {/* Flechas orden */}
              <div className="flex flex-col gap-0.5 pt-0.5 flex-shrink-0">
                <button disabled={idx === 0 || savingId === t.id} onClick={() => moveOrden(t, -1)}
                  className="p-0.5 rounded hover:bg-accent disabled:opacity-30">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button disabled={idx === tips.length - 1 || savingId === t.id} onClick={() => moveOrden(t, 1)}
                  className="p-0.5 rounded hover:bg-accent disabled:opacity-30">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Contenido */}
              <div className="flex-1 min-w-0">
                {editingId === t.id ? (
                  <div className="flex items-center gap-2 mb-1">
                    <Input value={editEtiqueta} onChange={e => setEditEtiqueta(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEtiqueta(t.id); if (e.key === 'Escape') setEditingId(null); }}
                      className="h-7 text-sm" autoFocus />
                    <button onClick={() => saveEtiqueta(t.id)} className="text-green-600"><Check className="h-4 w-4" /></button>
                    <button onClick={() => setEditingId(null)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <p className="text-sm font-medium cursor-pointer hover:underline mb-1"
                    onClick={() => { setEditingId(t.id); setEditEtiqueta(t.etiqueta); }}>
                    {t.etiqueta}
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => patch(t.id, { creaCliente: !t.creaCliente })} disabled={savingId === t.id}>
                    <Badge variant={t.creaCliente ? 'success' : 'default'} className="text-[10px] px-1.5 py-0">
                      {t.creaCliente ? 'Crea cliente' : 'No crea cliente'}
                    </Badge>
                  </button>
                  <button onClick={() => patch(t.id, { eliminaProspecto: !t.eliminaProspecto })} disabled={savingId === t.id}>
                    <Badge variant={t.eliminaProspecto ? 'destructive' : 'default'} className="text-[10px] px-1.5 py-0">
                      {t.eliminaProspecto ? 'Elimina prospecto' : 'No elimina'}
                    </Badge>
                  </button>
                  <button onClick={() => patch(t.id, { activa: !t.activa })} disabled={savingId === t.id}>
                    <Badge variant={t.activa ? 'success' : 'warning'} className="text-[10px] px-1.5 py-0">
                      {t.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </button>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => setDeleteConfirm(t)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla — desktop */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 text-center">Orden</TableHead>
                <TableHead>Etiqueta</TableHead>
                <TableHead className="text-center w-32">Crea cliente</TableHead>
                <TableHead className="text-center w-36">Elimina prospecto</TableHead>
                <TableHead className="text-center w-24">Activa</TableHead>
                <TableHead className="text-right w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tips.length === 0 ? (
                <TableEmptyState colSpan={6} message="No hay tipificaciones" />
              ) : tips.map((t, idx) => (
                <TableRow key={t.id} className={!t.activa ? 'opacity-50' : ''}>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <button disabled={idx === 0 || savingId === t.id} onClick={() => moveOrden(t, -1)}
                        className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors" title="Subir">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-xs text-muted-foreground w-5 text-center">{t.orden + 1}</span>
                      <button disabled={idx === tips.length - 1 || savingId === t.id} onClick={() => moveOrden(t, 1)}
                        className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors" title="Bajar">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingId === t.id ? (
                      <div className="flex items-center gap-2">
                        <Input value={editEtiqueta} onChange={e => setEditEtiqueta(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEtiqueta(t.id); if (e.key === 'Escape') setEditingId(null); }}
                          className="h-7 text-sm" autoFocus />
                        <button onClick={() => saveEtiqueta(t.id)} className="text-green-600 hover:text-green-700"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <span className="cursor-pointer hover:underline"
                        onClick={() => { setEditingId(t.id); setEditEtiqueta(t.etiqueta); }} title="Clic para editar">
                        {t.etiqueta}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <button onClick={() => patch(t.id, { creaCliente: !t.creaCliente })} disabled={savingId === t.id}>
                      {t.creaCliente ? <Badge variant="success">Sí</Badge> : <Badge variant="default">No</Badge>}
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <button onClick={() => patch(t.id, { eliminaProspecto: !t.eliminaProspecto })} disabled={savingId === t.id}>
                      {t.eliminaProspecto ? <Badge variant="destructive">Sí</Badge> : <Badge variant="default">No</Badge>}
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <button onClick={() => patch(t.id, { activa: !t.activa })} disabled={savingId === t.id}>
                      {t.activa ? <Badge variant="success">Activa</Badge> : <Badge variant="warning">Inactiva</Badge>}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title="Eliminar" onClick={() => setDeleteConfirm(t)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Haz clic en la etiqueta para editarla · Haz clic en un badge para activar/desactivar · Usa las flechas para reordenar
      </p>

      {/* Crear nueva */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva tipificación</DialogTitle>
            <DialogDescription>Define cómo se llamará y su comportamiento al registrarla.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Etiqueta (nombre visible)</label>
              <Input
                value={newEtiqueta}
                onChange={e => setNewEtiqueta(e.target.value)}
                placeholder="Ej: ✅ Venta realizada"
                required
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newCreaCliente}
                  onChange={e => { setNewCreaCliente(e.target.checked); if (e.target.checked) setNewEliminaProspecto(false); }}
                  className="h-4 w-4 accent-primary cursor-pointer"
                />
                <span className="text-sm">Crea cliente automáticamente</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newEliminaProspecto}
                  onChange={e => { setNewEliminaProspecto(e.target.checked); if (e.target.checked) setNewCreaCliente(false); }}
                  className="h-4 w-4 accent-primary cursor-pointer"
                />
                <span className="text-sm">Elimina el prospecto</span>
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={addLoading}>{addLoading ? 'Creando...' : 'Crear'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      {deleteConfirm && (
        <Dialog open onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>¿Eliminar tipificación?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Se eliminará <strong>{deleteConfirm.etiqueta}</strong> permanentemente.
              Los prospectos con esta tipificación no se verán afectados.
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>Eliminar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ── Tab Equipos ───────────────────────────────────────────────────────────────

interface EquipoUser { id: string; nombre: string | null; apellidos: string | null; email: string; }
interface EquipoMiembro { id: string; userId: string; user: EquipoUser; }
interface Equipo {
  id: string;
  nombre: string;
  teamLeadId: string | null;
  teamLead: EquipoUser | null;
  miembros: EquipoMiembro[];
}

function TabEquipos({ users }: { users: User[] }) {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; equipo: Equipo | null }>({ open: false, equipo: null });
  const [nombre, setNombre] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [miembrosIds, setMiembrosIds] = useState<string[]>([]);
  const [addMiembroId, setAddMiembroId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const nombreUsuario = (u: EquipoUser) =>
    u.nombre && u.apellidos ? `${u.nombre} ${u.apellidos}` : u.email;

  const fetchEquipos = useCallback(async () => {
    const res = await fetch('/api/equipos');
    if (res.ok) {
      const data = await res.json();
      setEquipos(data.equipos ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEquipos(); }, [fetchEquipos]);

  function openCreate() {
    setNombre('');
    setTeamLeadId('');
    setMiembrosIds([]);
    setAddMiembroId('');
    setDialog({ open: true, equipo: null });
  }

  function openEdit(e: Equipo) {
    setNombre(e.nombre);
    setTeamLeadId(e.teamLeadId ?? '');
    setMiembrosIds(e.miembros.map(m => m.userId));
    setAddMiembroId('');
    setDialog({ open: true, equipo: e });
  }

  function closeDialog() { setDialog({ open: false, equipo: null }); }

  function addMiembro() {
    if (!addMiembroId || miembrosIds.includes(addMiembroId)) return;
    setMiembrosIds(prev => [...prev, addMiembroId]);
    setAddMiembroId('');
  }

  function removeMiembro(userId: string) {
    setMiembrosIds(prev => prev.filter(id => id !== userId));
    if (teamLeadId === userId) setTeamLeadId('');
  }

  async function handleSave() {
    if (!nombre.trim()) { toast.error('El nombre del equipo es requerido'); return; }
    setSaving(true);
    try {
      const body = { nombre, teamLeadId: teamLeadId || null, miembrosIds };
      const isEdit = !!dialog.equipo;
      const res = await fetch(
        isEdit ? `/api/equipos/${dialog.equipo!.id}` : '/api/equipos',
        { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al guardar');
      }
      toast.success(isEdit ? 'Equipo actualizado' : 'Equipo creado');
      closeDialog();
      fetchEquipos();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este equipo?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/equipos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Equipo eliminado');
      fetchEquipos();
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  }

  // Usuarios disponibles para agregar (no están aún en el equipo)
  const disponibles = users.filter(u => !miembrosIds.includes(u.id));
  // Usuarios del equipo actual (para mostrar nombres)
  const miembrosDetalle = miembrosIds
    .map(id => users.find(u => u.id === id))
    .filter((u): u is User => !!u);

  if (loading) return <p className="text-sm text-muted-foreground py-6 text-center">Cargando...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{equipos.length} equipo{equipos.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo equipo
        </Button>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {equipos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay equipos creados</p>
        ) : equipos.map(e => (
          <div key={e.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{e.nombre}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {e.teamLead ? (
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-primary" />
                      {nombreUsuario(e.teamLead)}
                    </span>
                  ) : 'Sin team lead'}
                </p>
              </div>
              <Badge variant="info">{e.miembros.length} miembro{e.miembros.length !== 1 ? 's' : ''}</Badge>
            </div>
            {e.miembros.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {e.miembros.map(m => (
                  <span key={m.id} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    {nombreUsuario(m.user)}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(e)}>
                <Edit className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDelete(e.id)} disabled={deletingId === e.id}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipo</TableHead>
              <TableHead>Team Lead</TableHead>
              <TableHead>Miembros</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipos.length === 0 ? (
              <TableEmptyState colSpan={4} message="No hay equipos creados" />
            ) : equipos.map(e => (
              <TableRow key={e.id}>
                <TableCell className="font-semibold">{e.nombre}</TableCell>
                <TableCell>
                  {e.teamLead ? (
                    <span className="flex items-center gap-1.5 text-sm">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      {nombreUsuario(e.teamLead)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {e.miembros.length === 0 ? (
                      <span className="text-muted-foreground text-sm">Sin miembros</span>
                    ) : e.miembros.map(m => (
                      <span key={m.id} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {nombreUsuario(m.user)}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)} disabled={deletingId === e.id}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog crear/editar */}
      {dialog.open && (
        <Dialog open onOpenChange={closeDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{dialog.equipo ? 'Editar equipo' : 'Nuevo equipo'}</DialogTitle>
              <DialogDescription>
                {dialog.equipo ? 'Modifica el nombre, team lead o miembros.' : 'Define el nombre, team lead y miembros del equipo.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Nombre */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nombre del equipo *</label>
                <Input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Costa Rica, Nicaragua..."
                />
              </div>

              {/* Team Lead */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Team Lead</label>
                <Select value={teamLeadId} onChange={e => setTeamLeadId(e.target.value)} className="w-full">
                  <option value="">— Sin team lead —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{displayName(u)}</option>
                  ))}
                </Select>
              </div>

              {/* Miembros */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Miembros</label>
                {/* Lista actual */}
                {miembrosDetalle.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {miembrosDetalle.map(u => (
                      <span key={u.id} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                        {displayName(u)}
                        <button
                          type="button"
                          onClick={() => removeMiembro(u.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Agregar miembro */}
                {disponibles.length > 0 ? (
                  <div className="flex gap-2">
                    <Select value={addMiembroId} onChange={e => setAddMiembroId(e.target.value)} className="flex-1">
                      <option value="">— Agregar miembro —</option>
                      {disponibles.map(u => (
                        <option key={u.id} value={u.id}>{displayName(u)}</option>
                      ))}
                    </Select>
                    <Button type="button" variant="outline" size="sm" onClick={addMiembro} disabled={!addMiembroId}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Todos los usuarios ya están en el equipo.</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : dialog.equipo ? 'Actualizar' : 'Crear equipo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

const TABS = [
  { key: 'usuarios',        label: 'Usuarios',        icon: Users       },
  { key: 'equipos',         label: 'Equipos',         icon: ShieldCheck },
  { key: 'metas',           label: 'Metas KPI',       icon: Target      },
  { key: 'tipificaciones',  label: 'Tipificaciones',  icon: List        },
] as const;

type Tab = typeof TABS[number]['key'];

export default function ConfiguracionPage() {
  const router = useRouter();
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>('usuarios');
  const [users, setUsers]       = useState<User[]>([]);

  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const res = await fetch('/api/auth/me');
      if (!res.ok) { router.push('/login'); return; }
      const { user } = await res.json();
      if (user?.role !== 'admin') { router.push('/'); return; }
      await fetchUsers();
      setLoading(false);
    }
    init();
  }, [router, fetchUsers]);

  if (loading) {
    return <MainLayout><TableSkeleton cols={5} /></MainLayout>;
  }

  const vendors = users;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground text-sm hidden sm:block">Administración del sistema</p>
        </div>

        {/* Tabs */}
        <div className="border-b overflow-x-auto">
          <nav className="-mb-px flex gap-4 sm:gap-6 min-w-max">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors whitespace-nowrap',
                    tab === t.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenido del tab */}
        {tab === 'usuarios' && (
          <TabUsuarios users={users} onRefresh={fetchUsers} />
        )}
        {tab === 'equipos' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Equipos de trabajo
              </CardTitle>
              <CardDescription>
                Organiza los vendedores en equipos con un Team Lead responsable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabEquipos users={users} />
            </CardContent>
          </Card>
        )}
        {tab === 'metas' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Metas de instalaciones por mes
              </CardTitle>
              <CardDescription>
                Define cuántas instalaciones debe lograr cada vendedor por mes. La columna Global aplica a todos salvo que tengan una meta individual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vendors.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No hay usuarios registrados.</p>
              ) : (
                <TabMetasKPI vendors={vendors} />
              )}
            </CardContent>
          </Card>
        )}
        {tab === 'tipificaciones' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <List className="h-4 w-4 text-primary" />
                Tipificaciones de prospectos
              </CardTitle>
              <CardDescription>
                Define los resultados disponibles al registrar un contacto con un prospecto. Puedes configurar cuáles crean un cliente o eliminan el prospecto automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabTipificaciones />
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
