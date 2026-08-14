import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MainLayout } from '@/components/layout/main-layout';
import { Check, X, Loader2, ShieldCheck, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Config (refleja la misma constante que el API) ──────────────────────────

const ROLES_CONFIG = [
  { key: 'superadmin', label: 'Superadmin',     description: 'Acceso total al sistema' },
  { key: 'admin',      label: 'Admin',           description: 'Administrador de empresa' },
  { key: 'teamlead',   label: 'Team Lead',       description: 'Líder de equipo de ventas' },
  { key: 'user',       label: 'Vendedor',        description: 'Agente de ventas' },
  { key: 'developer',  label: 'Desarrollador',   description: 'Acceso técnico limitado' },
] as const;

const PANTALLAS_CONFIG = [
  { id: 'dashboard',         label: 'Dashboard',          acciones: ['ver'] },
  { id: 'clientes_gpon',     label: 'Clientes GPON',      acciones: ['ver', 'crear', 'editar', 'eliminar'] },
  { id: 'clientes_postpago', label: 'Clientes Postpago',  acciones: ['ver', 'crear', 'editar'] },
  { id: 'prospectos',        label: 'Prospectos',         acciones: ['ver', 'solicitar', 'asignar', 'contactar'] },
  { id: 'interphone',        label: 'Interphone',         acciones: ['ver', 'llamar'] },
  { id: 'nomina',            label: 'Nómina',             acciones: ['ver', 'crear', 'aprobar', 'pagar', 'editar'] },
  { id: 'adelantos',         label: 'Adelantos',          acciones: ['ver', 'crear', 'aprobar', 'rechazar'] },
  { id: 'inventario_sim',    label: 'Inventario SIM',     acciones: ['ver', 'agregar', 'asignar'] },
  { id: 'oferta_comercial',  label: 'Oferta Comercial',   acciones: ['ver', 'crear', 'editar', 'eliminar'] },
  { id: 'configuracion',     label: 'Configuración',      acciones: ['ver', 'usuarios', 'equipos', 'metas', 'tipificaciones', 'api'] },
  { id: 'empresas',          label: 'Empresas',           acciones: ['ver', 'crear', 'editar', 'eliminar'] },
  { id: 'roles',             label: 'Gestión de Roles',   acciones: ['ver', 'editar'] },
] as const;

const ACCION_LABELS: Record<string, string> = {
  ver: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
  solicitar: 'Solicitar',
  asignar: 'Asignar',
  contactar: 'Contactar',
  llamar: 'Llamar',
  aprobar: 'Aprobar',
  rechazar: 'Rechazar',
  pagar: 'Pagar',
  agregar: 'Agregar',
  usuarios: 'Usuarios',
  equipos: 'Equipos',
  metas: 'Metas',
  tipificaciones: 'Tipificaciones',
  api: 'API',
};

type Rol = (typeof ROLES_CONFIG)[number]['key'];
type Permisos = Record<string, Record<string, string[]>>;

// ─── Componente principal ─────────────────────────────────────────────────────

export default function RolesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeRol, setActiveRol] = useState<Rol>('admin');
  const [permisos, setPermisos] = useState<Permisos>({});
  const [saving, setSaving] = useState<string | null>(null); // clave "pantalla-accion"

  const fetchPermisos = useCallback(async () => {
    const res = await fetch('/api/rol-permisos');
    if (res.ok) {
      const data = await res.json();
      setPermisos(data.permisos);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const res = await fetch('/api/auth/me');
      if (!res.ok) { router.push('/login'); return; }
      const { user } = await res.json();
      if (user?.role !== 'superadmin') { router.push('/'); return; }
      await fetchPermisos();
      setLoading(false);
    }
    init();
  }, [router, fetchPermisos]);

  async function toggleAccion(pantalla: string, accion: string) {
    const rolPermisos = permisos[activeRol] ?? {};
    const current: string[] = rolPermisos[pantalla] ?? [];
    const next = current.includes(accion)
      ? current.filter(a => a !== accion)
      : [...current, accion];

    // Actualización optimista
    setPermisos(prev => ({
      ...prev,
      [activeRol]: { ...prev[activeRol], [pantalla]: next },
    }));

    const key = `${pantalla}-${accion}`;
    setSaving(key);
    try {
      const res = await fetch('/api/rol-permisos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol: activeRol, pantalla, acciones: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Error al guardar el permiso');
      // Revertir
      await fetchPermisos();
    } finally {
      setSaving(null);
    }
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

  const rolActivo = ROLES_CONFIG.find(r => r.key === activeRol)!;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestión de Roles</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Define qué pantallas y acciones puede realizar cada puesto en el sistema.
            </p>
          </div>
        </div>

        {/* Aviso informativo */}
        <div className="flex gap-2.5 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20 p-3 text-sm text-blue-800 dark:text-blue-300">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            Los permisos aquí configurados son el registro oficial de cada rol. Los cambios se guardan automáticamente.
          </p>
        </div>

        {/* Tabs de roles */}
        <div className="flex flex-wrap gap-2">
          {ROLES_CONFIG.map(rol => (
            <button
              key={rol.key}
              onClick={() => setActiveRol(rol.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                activeRol === rol.key
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-foreground border-border hover:bg-accent'
              )}
            >
              {rol.label}
            </button>
          ))}
        </div>

        {/* Descripción del rol activo */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-base">{rolActivo.label}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{rolActivo.description}</p>
            </div>
            {saving && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Guardando…
              </div>
            )}
          </div>

          {/* Tabla de permisos */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-medium text-muted-foreground py-2 pr-4 w-40">Pantalla</th>
                  <th className="text-left font-medium text-muted-foreground py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {PANTALLAS_CONFIG.map(pantalla => {
                  const accionesActivas: string[] = permisos[activeRol]?.[pantalla.id] ?? [];
                  return (
                    <tr key={pantalla.id} className="group">
                      <td className="py-3 pr-4 align-top">
                        <span className="font-medium text-foreground whitespace-nowrap">
                          {pantalla.label}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {pantalla.acciones.map(accion => {
                            const activa = accionesActivas.includes(accion);
                            const key = `${pantalla.id}-${accion}`;
                            const isSaving = saving === key;
                            return (
                              <button
                                key={accion}
                                onClick={() => toggleAccion(pantalla.id, accion)}
                                disabled={isSaving}
                                title={activa ? `Quitar "${ACCION_LABELS[accion] ?? accion}"` : `Otorgar "${ACCION_LABELS[accion] ?? accion}"`}
                                className={cn(
                                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                                  'disabled:opacity-60 disabled:cursor-not-allowed',
                                  activa
                                    ? 'bg-primary/10 text-primary border-primary/25 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/25'
                                    : 'bg-muted text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/25'
                                )}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                ) : activa ? (
                                  <Check className="h-2.5 w-2.5" />
                                ) : (
                                  <X className="h-2.5 w-2.5" />
                                )}
                                {ACCION_LABELS[accion] ?? accion}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vista resumen (overview rápido de todos los roles) */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm mb-3">Resumen de accesos por rol</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-medium text-muted-foreground py-2 pr-4 w-40">Pantalla</th>
                  {ROLES_CONFIG.map(r => (
                    <th key={r.key} className="text-center font-medium text-muted-foreground py-2 px-3 whitespace-nowrap">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {PANTALLAS_CONFIG.map(pantalla => (
                  <tr key={pantalla.id} className="hover:bg-muted/30">
                    <td className="py-2 pr-4 font-medium text-foreground whitespace-nowrap">{pantalla.label}</td>
                    {ROLES_CONFIG.map(rol => {
                      const activas: string[] = permisos[rol.key]?.[pantalla.id] ?? [];
                      const tieneAcceso = activas.length > 0;
                      return (
                        <td
                          key={rol.key}
                          className="py-2 px-3 text-center"
                          onClick={() => setActiveRol(rol.key)}
                        >
                          {tieneAcceso ? (
                            <span
                              className="inline-block text-primary cursor-pointer"
                              title={activas.map(a => ACCION_LABELS[a] ?? a).join(', ')}
                            >
                              <Check className="h-3.5 w-3.5 mx-auto" />
                            </span>
                          ) : (
                            <span className="inline-block text-muted-foreground/40">
                              <X className="h-3.5 w-3.5 mx-auto" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Hacé click en cualquier celda para editar ese rol en detalle.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
