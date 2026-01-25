import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  nombre: string | null;
  apellidos: string | null;
  role: string;
}

interface ProfileFormData {
  nombre: string;
  apellidos: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      nombre: '',
      apellidos: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    async function checkAuth() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
      } else {
        await loadProfile();
      }
    }
    checkAuth();
  }, [router]);

  async function loadProfile() {
    try {
      const response = await fetch('/api/users/profile');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        reset({
          nombre: data.user.nombre || '',
          apellidos: data.user.apellidos || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error) {
      toast.error('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    setSubmitting(true);

    try {
      const updateData: any = {
        nombre: data.nombre || null,
        apellidos: data.apellidos || null,
      };

      // Si se está cambiando la contraseña
      if (changingPassword) {
        if (!data.currentPassword) {
          toast.error('Debes ingresar tu contraseña actual');
          setSubmitting(false);
          return;
        }
        if (!data.newPassword) {
          toast.error('Debes ingresar una nueva contraseña');
          setSubmitting(false);
          return;
        }
        if (data.newPassword !== data.confirmPassword) {
          toast.error('Las contraseñas no coinciden');
          setSubmitting(false);
          return;
        }
        updateData.password = data.newPassword;
        updateData.currentPassword = data.currentPassword;
      }

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Perfil actualizado correctamente');
        setChangingPassword(false);
        reset({
          nombre: result.user.nombre || '',
          apellidos: result.user.apellidos || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setUser(result.user);
      } else {
        toast.error(result.error || 'Error al actualizar el perfil');
      }
    } catch (error) {
      toast.error('Error al procesar la solicitud');
    } finally {
      setSubmitting(false);
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
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
            <p className="text-muted-foreground">
              Gestiona tu información personal y contraseña
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>
              Actualiza tu nombre y apellidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Email
                  </label>
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    El email no se puede cambiar
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Rol
                  </label>
                  <Input
                    value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Nombre
                  </label>
                  <Input
                    {...register('nombre')}
                    placeholder="Ingrese su nombre"
                  />
                  {errors.nombre && (
                    <p className="text-sm text-destructive mt-1">{errors.nombre.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Apellidos
                  </label>
                  <Input
                    {...register('apellidos')}
                    placeholder="Ingrese sus apellidos"
                  />
                  {errors.apellidos && (
                    <p className="text-sm text-destructive mt-1">{errors.apellidos.message}</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Cambiar Contraseña</h3>
                    <p className="text-sm text-muted-foreground">
                      Deja estos campos vacíos si no deseas cambiar tu contraseña
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setChangingPassword(!changingPassword);
                      if (changingPassword) {
                        reset({
                          ...watch(),
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: '',
                        });
                      }
                    }}
                  >
                    {changingPassword ? 'Cancelar' : 'Cambiar Contraseña'}
                  </Button>
                </div>

                {changingPassword && (
                  <div className="grid gap-4 md:grid-cols-1 space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Contraseña Actual <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="password"
                        {...register('currentPassword', {
                          required: changingPassword ? 'La contraseña actual es requerida' : false,
                        })}
                        placeholder="Ingrese su contraseña actual"
                      />
                      {errors.currentPassword && (
                        <p className="text-sm text-destructive mt-1">{errors.currentPassword.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Nueva Contraseña <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="password"
                        {...register('newPassword', {
                          required: changingPassword ? 'La nueva contraseña es requerida' : false,
                          minLength: {
                            value: 6,
                            message: 'La contraseña debe tener al menos 6 caracteres',
                          },
                        })}
                        placeholder="Ingrese su nueva contraseña"
                      />
                      {errors.newPassword && (
                        <p className="text-sm text-destructive mt-1">{errors.newPassword.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Confirmar Nueva Contraseña <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="password"
                        {...register('confirmPassword', {
                          required: changingPassword ? 'Debes confirmar la contraseña' : false,
                          validate: (value) => {
                            if (changingPassword && value !== watch('newPassword')) {
                              return 'Las contraseñas no coinciden';
                            }
                            return true;
                          },
                        })}
                        placeholder="Confirme su nueva contraseña"
                      />
                      {errors.confirmPassword && (
                        <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
