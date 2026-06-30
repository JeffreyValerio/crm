/**
 * Shared label/display utilities used across pages.
 */

// ── Tipos mínimos reutilizables ───────────────────────────────────────────────

export interface UsuarioBasico {
  nombre?: string | null;
  apellidos?: string | null;
  email?: string;
}

// ── Usuarios ─────────────────────────────────────────────────────────────────

/**
 * Nombre completo del usuario.
 * Fallback: email → "N/A"
 */
export function getUserDisplayName(user: UsuarioBasico | null | undefined): string {
  if (!user) return 'N/A';
  const nombre = [user.nombre, user.apellidos].filter(Boolean).join(' ');
  return nombre || user.email || 'N/A';
}

/**
 * Nombre completo del usuario para contextos de prospecto.
 * Fallback: email → "—"
 */
export function nombreUsuario(user: UsuarioBasico | null | undefined): string {
  if (!user) return '—';
  return [user.nombre, user.apellidos].filter(Boolean).join(' ') || user.email || '—';
}

// ── Estados de cliente ───────────────────────────────────────────────────────

export function getValidationStatusLabel(status: string | null): string {
  const labels: Record<string, string> = {
    EN_PROCESO_VALIDACION: 'En validación',
    APROBADA:              'Aprobada',
    REQUIERE_DEPOSITO:     'Requiere Depósito',
    NO_APLICA:             'No Aplica',
    INCOBRABLE:            'Incobrable',
    DEUDA_MENOR_ANIO:      'Deuda Menor a un Año',
  };
  return labels[status || ''] || status || 'N/A';
}

export function getSaleStatusLabel(status: string | null): string {
  const labels: Record<string, string> = {
    PENDIENTE_INSTALACION:          'Pendiente Instalación',
    INSTALADA:                      'Instalada',
    CANCELADA:                      'Cancelada',
    NO_COMPLETO_FACEID:             'No completó FaceID',
    CANCELADO_POR_COBERTURA:        'Cancelado por cobertura',
    CLIENTE_NO_PERMITE_INSTALACION: 'Cliente no permite instalación',
  };
  return labels[status || ''] || status || 'N/A';
}

// ── Estados de adelanto ──────────────────────────────────────────────────────

export function getAdvanceStatusLabel(estado: string): string {
  const labels: Record<string, string> = {
    PENDIENTE:   'Pendiente',
    APROBADO:    'Aprobado',
    RECHAZADO:   'Rechazado',
    EN_COBRO:    'En Cobro',
    COMPLETADO:  'Completado',
  };
  return labels[estado] ?? estado;
}
