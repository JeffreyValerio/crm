import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  nombre: string | null;
  apellidos: string | null;
  role: string;
  password: string | null;
  inviteToken: string | null;
  invitedAt: string | null;
  createdAt: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);

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

        // Cargar usuarios
        const usersResponse = await fetch('/api/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData.users || []);
        }
        
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setEditDialogOpen(true);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;

    if (!newPassword) {
      toast.error('La contraseña es requerida');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setEditLoading(true);

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Contraseña actualizada correctamente');
        setEditDialogOpen(false);
        setEditingUser(null);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.error || 'Error al actualizar la contraseña');
      }
    } catch (error) {
      toast.error('Error al procesar la solicitud');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      return;
    }

    const response = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setUsers(users.filter(user => user.id !== id));
      toast.success('Usuario eliminado correctamente');
    } else {
      const data = await response.json();
      toast.error(data.error || 'Error al eliminar el usuario');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess(false);
    setInviteLoading(true);

    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setInviteSuccess(true);
        setInviteEmail('');
        // Recargar usuarios
        const usersResponse = await fetch('/api/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData.users || []);
        }
        setTimeout(() => {
          setInviteDialogOpen(false);
          setInviteSuccess(false);
        }, 2000);
      } else {
        setInviteError(data.error || 'Error al enviar la invitación');
      }
    } catch (error) {
      setInviteError('Error al procesar la solicitud');
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
            <p className="text-muted-foreground">
              Gestiona los usuarios del sistema
            </p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Invitar Usuario
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuarios</CardTitle>
            <CardDescription>
              Todos los usuarios registrados en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No hay usuarios registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const displayName = user.nombre && user.apellidos 
                      ? `${user.nombre} ${user.apellidos}` 
                      : user.email;
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{displayName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                        <TableCell>
                          {user.password ? (
                            <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">
                              Activo
                            </span>
                          ) : user.inviteToken ? (
                            <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-600">
                              Invitación Pendiente
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                              Inactivo
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(user)}
                              title="Editar contraseña"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(user.id)}
                              title="Eliminar usuario"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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

        {/* Diálogo de Invitación */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar Usuario</DialogTitle>
              <DialogDescription>
                Envía una invitación por correo electrónico para que el usuario se una al sistema
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleInvite} className="space-y-4">
              {inviteError && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  {inviteError}
                </div>
              )}

              {inviteSuccess && (
                <div className="p-3 bg-green-500/10 text-green-600 rounded-md text-sm">
                  ¡Invitación enviada correctamente!
                </div>
              )}

              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium mb-1">
                  Email
                </label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  disabled={inviteLoading || inviteSuccess}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setInviteDialogOpen(false);
                    setInviteEmail('');
                    setInviteError('');
                    setInviteSuccess(false);
                  }}
                  disabled={inviteLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={inviteLoading || inviteSuccess}>
                  {inviteLoading ? 'Enviando...' : inviteSuccess ? 'Enviado ✓' : 'Enviar Invitación'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Edición de Contraseña */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar Contraseña</DialogTitle>
              <DialogDescription>
                Cambia la contraseña del usuario {editingUser?.nombre && editingUser?.apellidos 
                  ? `${editingUser.nombre} ${editingUser.apellidos}` 
                  : editingUser?.email}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium mb-1">
                  Nueva Contraseña
                </label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Ingresa la nueva contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={editLoading}
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Mínimo 6 caracteres
                </p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">
                  Confirmar Contraseña
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirma la nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={editLoading}
                  minLength={6}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditingUser(null);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={editLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}