/**
 * lib/permisos.ts  — SERVER ONLY
 *
 * Lógica de permisos con acceso a DB y cache en proceso.
 * NO importar desde páginas cliente — usar @/lib/permisos-config para constantes.
 */

import { prisma } from '@/lib/prisma';
export { PANTALLAS_CONFIG, ROLES_SISTEMA, DEFAULTS } from '@/lib/permisos-config';
export type { PantallaId, RolSistema } from '@/lib/permisos-config';
import { DEFAULTS } from '@/lib/permisos-config';

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
  rol: string | undefined | null,
  pantalla: string,
  accion: string,
): Promise<boolean> {
  if (!rol) return false;
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
