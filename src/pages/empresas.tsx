import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MainLayout } from '@/components/layout/main-layout';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { toast } from 'sonner';
import { Building2, Plus, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { isSuperAdmin } from '@/lib/roles';

interface Admin {
  id: string;
  nombre: string | null;
  apellidos: string | null;
  email: string;
}

interface Empresa {
  id: string;
  nombre: string;
  createdAt: string;
  _count: { equipos: number; usuarios: number };
  usuarios: Admin[];
}

type DialogMode = 'create' | 'edit' | 'invite' | 'delete' | null;

export default function EmpresasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selected, setSelected] = useState<Empresa | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [nombre, setNombre] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    async function checkAuth() {
      const res = await fetch('/api/auth/me');
      if (!res.ok) { router.push('/login'); return; }
      const data = await res.json();
      if (!isSuperAdmin(data.user?.role)) { router.push('/'); return; }
      await loadEmpresas();
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  async function loadEmpresas() {
    const res = await fetch('/api/empresas');
    if (res.ok) {
      const data = await res.json();
      setEmpresas(data.empresas);
    }
  }

  function openCreate() {
    setNombre('');
    setDialogMode('create');
  }

  function openEdit(e: Empresa) {
    setSelected(e);
    setNombre(e.nombre);
    setDialogMode('edit');
  }

  function openInvite(e: Empresa) {
    setSelected(e);
    setInviteEmail('');
    setDialogMode('invite');
  }

  function openDelete(e: Empresa) {
    setSelected(e);
    setDialogMode('delete');
  }

  function closeDialog() {
    setDialogMode(null);
    setSelected(null);
  }

  async function handleCreate() {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Error al crear empresa');
        return;
      }
      toast.success('Empresa creada');
      closeDialog();
      await loadEmpresas();
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!nombre.trim() || !selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/empresas/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Error al actualizar');
        return;
      }
      toast.success('Empresa actualizada');
      closeDialog();
      await loadEmpresas();
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || !selected) return;
    setSaving(true);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: 'admin', empresaId: selected.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Error al invitar');
        return;
      }
      toast.success(`Invitación enviada a ${inviteEmail}`);
      closeDialog();
      await loadEmpresas();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/empresas/${selected.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Error al eliminar');
        return;
      }
      toast.success('Empresa eliminada');
      closeDialog();
      await loadEmpresas();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <TableSkeleton cols={4} rows={5} showFilters={false} />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Empresas</h1>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Empresa
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead className="text-center">Equipos</TableHead>
                <TableHead className="text-center">Usuarios</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.length === 0 ? (
                <TableEmptyState
                  colSpan={5}
                  icon={<Building2 className="h-8 w-8 text-muted-foreground" />}
                  message="Sin empresas — crea la primera para empezar."
                />
              ) : (
                empresas.map((e) => {
                  const admin = e.usuarios[0];
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.nombre}</TableCell>
                      <TableCell>
                        {e.usuarios.length === 0 ? (
                          <Badge variant="warning" className="text-xs">Sin admin</Badge>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {e.usuarios.map((a) => (
                              <div key={a.id} className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {[a.nombre, a.apellidos].filter(Boolean).join(' ') || a.email}
                                </span>
                                <span className="text-xs text-muted-foreground">{a.email}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{e._count.equipos}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{e._count.usuarios}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openInvite(e)}
                            title="Invitar admin"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(e)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDelete(e)}
                            title="Eliminar"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog: Crear empresa */}
      <Dialog open={dialogMode === 'create'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label htmlFor="nombre" className="text-sm font-medium block mb-1">Nombre de la empresa</label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Distribuidora XYZ"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !nombre.trim()}>
              {saving ? 'Creando...' : 'Crear Empresa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar empresa */}
      <Dialog open={dialogMode === 'edit'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label htmlFor="nombre-edit" className="text-sm font-medium block mb-1">Nombre de la empresa</label>
              <Input
                id="nombre-edit"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={saving || !nombre.trim()}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Invitar admin */}
      <Dialog open={dialogMode === 'invite'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar Admin — {selected?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              El usuario recibirá un correo con un enlace para activar su cuenta como <strong>admin</strong> de esta empresa.
            </p>
            <div className="space-y-1.5">
              <label htmlFor="invite-email" className="text-sm font-medium block mb-1">Correo electrónico</label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="admin@empresa.com"
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={saving || !inviteEmail.trim()}>
              <UserPlus className="h-4 w-4 mr-2" />
              {saving ? 'Enviando...' : 'Enviar invitación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Eliminar empresa */}
      <Dialog open={dialogMode === 'delete'} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Empresa</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              ¿Seguro que querés eliminar <strong>{selected?.nombre}</strong>?
              Los usuarios y equipos asociados quedarán sin empresa asignada.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
