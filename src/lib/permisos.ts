/**
 * lib/permisos.ts
 *
 * Fuente de verdad para el sistema de permisos por rol.
 * - Define pantallas, acciones posibles y valores por defecto.
 * - Expone hasPermiso() y getPermisosRol() con cache en proceso (TTL 60s).
 * - Las APIs y páginas importan desde aquí; nunca directamente desde /api/rol-permisos.
 */

import { prisma } from '@/lib/prisma';

// ─── Definiciones de pantallas ────────────────────────────────────────────────

export const PANTALLAS_CONFIG = [
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

export type PantallaId = (typeof PANTALLAS_CONFIG)[number]['id'];

export const ROLES_SISTEMA = ['superadmin', 'admin', 'teamlead', 'user', 'developer'] as const;
export type RolSistema = (typeof ROLES_SISTEMA)[number];

// ─── Defaults (refleja el estado actual del código hardcodeado) ───────────────

export const DEFAULTS: Record<string, Record<string, string[]>> = {
  superadmin: {
    dashboard:         ['ver'],
    clientes_gpon:     ['ver', 'crear', 'editar', 'eliminar'],
    clientes_postpago: ['ver', 'crear', 'editar'],
    prospectos:        ['ver', 'solicitar', 'asignar', 'contactar'],
    interphone:        ['ver', 'llamar'],
    nomina:            ['ver', 'crear', 'aprobar', 'pagar', 'editar'],
    adelantos:         ['ver', 'crear', 'aprobar', 'rechazar'],
    inventario_sim:    ['ver', 'agregar', 'asignar'],
    oferta_comercial:  ['ver', 'crear', 'editar', 'eliminar'],
    configuracion:     ['ver', 'usuarios', 'equipos', 'metas', 'tipificaciones', 'api'],
    empresas:          ['ver', 'crear', 'editar', 'eliminar'],
    roles:             ['ver', 'editar'],
  },
  admin: {
    dashboard:         ['ver'],
    clientes_gpon:     ['ver', 'crear', 'editar'],
    clientes_postpago: ['ver', 'crear', 'editar'],
    prospectos:        ['ver', 'asignar', 'contactar'],
    interphone:        ['ver', 'llamar'],
    nomina:            ['ver', 'crear', 'aprobar', 'pagar', 'editar'],
    adelantos:         ['ver', 'aprobar', 'rechazar'],
    inventario_sim:    ['ver', 'agregar', 'asignar'],
    oferta_comercial:  ['ver', 'crear', 'editar', 'eliminar'],
    configuracion:     ['ver', 'usuarios', 'equipos', 'metas'],
    empresas:          [],
    roles:             [],
  },
  teamlead: {
    dashboard:         ['ver'],
    clientes_gpon:     ['ver', 'crear', 'editar'],
    clientes_postpago: ['ver', 'crear', 'editar'],
    prospectos:        ['ver', 'solicitar', 'contactar'],
    interphone:        ['ver', 'llamar'],
    nomina:            ['ver'],
    adelantos:         ['ver', 'crear'],
    inventario_sim:    [],
    oferta_comercial:  [],
    configuracion:     [],
    empresas:          [],
    roles:             [],
  },
  user: {
    dashboard:         ['ver'],
    clientes_gpon:     ['ver', 'crear'],
    clientes_postpago: ['ver', 'crear'],
    prospectos:        ['ver', 'solicitar', 'contactar'],
    interphone:        ['ver', 'llamar'],
    nomina:            ['ver'],
    adelantos:         ['ver', 'crear'],
    inventario_sim:    [],
    oferta_comercial:  [],
    configuracion:     [],
    empresas:          [],
    roles:             [],
  },
  developer: {
    dashboard:         [],
    clientes_gpon:     [],
    clientes_postpago: [],
    prospectos:        [],
    interphone:        [],
    nomina:            [],
    adelantos:         [],
    inventario_sim:    [],
    oferta_comercial:  [],
    configuracion:     ['ver', 'api'],
    empresas:          [],
    roles:             [],
  },
};

// ─── Cache en proceso ─────────────────────────────────────────────────────────
//
// Cada entrada vive 60 segundos. En Vercel (lambdas warm) reduce hits a DB
// para requests consecutivos dentro del mismo proceso.

const TTL_MS = 60_000;
const _cache = new Map<string, { acciones: string[]; expiresAt: number }>();

function _getCached(rol: string, pantalla: string): string[] | null {
  const entry = _cache.get(`${rol}:${pantalla}`);
  if (!entry || Date.now() > entry.expiresAt) {
    _cache.delete(`${rol}:${pantalla}`);
    return null;
  }
  return entry.acciones;
}

function _setCache(rol: string, pantalla: string, acciones: string[]): void {
  _cache.set(`${rol}:${pantalla}`, { acciones, expiresAt: Date.now() + TTL_MS });
}

/** Borra el cache completo. Llamar después de un PUT en /api/rol-permisos. */
export function invalidarCachePermisos(): void {
  _cache.clear();
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Devuelve las acciones permitidas para un rol en una pantalla.
 * Consulta DB; si no hay registro usa el default del código.
 */
export async function getAcciones(rol: string, pantalla: string): Promise<string[]> {
  const cached = _getCached(rol, pantalla);
  if (cached !== null) return cached;

  const registro = await prisma.rolPermiso.findUnique({
    where: { rol_pantalla: { rol, pantalla } },
    select: { acciones: true },
  });

  const acciones = registro?.acciones ?? DEFAULTS[rol]?.[pantalla] ?? [];
  _setCache(rol, pantalla, acciones);
  return acciones;
}

/**
 * Verifica si un rol tiene una acción específica en una pantalla.
 *
 * @example
 *   if (!(await hasPermiso(session.role, 'clientes_gpon', 'crear'))) {
 *     return res.status(403).json({ error: 'Sin permiso' });
 *   }
 */
export async function hasPermiso(
  rol: string,
  pantalla: string,
  accion: string,
): Promise<boolean> {
  const acciones = await getAcciones(rol, pantalla);
  return acciones.includes(accion);
}

/**
 * Devuelve todos los permisos de un rol en una sola consulta DB.
 * Útil para el sidebar y para páginas que necesitan múltiples checks.
 * Rellena el cache de paso para consultas individuales posteriores.
 */
export async function getPermisosRol(rol: string): Promise<Record<string, string[]>> {
  const registros = await prisma.rolPermiso.findMany({
    where: { rol },
    select: { pantalla: true, acciones: true },
  });

  // Empezar desde defaults y sobrescribir con lo que hay en DB
  const permisos: Record<string, string[]> = { ...(DEFAULTS[rol] ?? {}) };
  for (const r of registros) {
    permisos[r.pantalla] = r.acciones;
    _setCache(rol, r.pantalla, r.acciones);
  }

  return permisos;
}
