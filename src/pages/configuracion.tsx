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
import { Plus, Edit, Trash2, Mail, Users, Target, ChevronLeft, ChevronRight } from 'lucide-react';
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

      <Card>
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
        <span className="text-xs text-muted-foreground ml-2">
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

// ── Página principal ──────────────────────────────────────────────────────────

const TABS = [
  { key: 'usuarios', label: 'Usuarios', icon: Users },
  { key: 'metas',   label: 'Metas KPI', icon: Target },
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
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">Administración del sistema</p>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="-mb-px flex gap-6">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors',
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
      </div>
    </MainLayout>
  );
}
