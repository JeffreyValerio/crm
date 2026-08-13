/**
 * Helpers de roles para centralizar las comprobaciones de permisos.
 * Roles: superadmin > admin > teamlead > user > developer
 */

/** Roles con privilegios de administración (todo excepto crear empresas) */
export function isAdmin(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'superadmin';
}

/** Solo el superadmin — puede crear/ver todas las empresas */
export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === 'superadmin';
}
