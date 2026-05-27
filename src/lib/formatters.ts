/**
 * Shared formatting utilities used across pages.
 */

/** ₡12.345,67 */
export function formatearColones(monto: number | string): string {
  const num = typeof monto === 'string' ? parseFloat(monto) : monto;
  return `₡${num.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "2026-05" → "May 2026" */
export function formatearPeriodo(periodo: string): string {
  const [año, mes] = periodo.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${meses[parseInt(mes) - 1]} ${año}`;
}

/** Quita +506, espacios y guiones — deja solo los 8 dígitos */
export function formatTel(tel: string | null | undefined): string | null {
  if (!tel) return null;
  return tel.replace(/^\+506\s?/, '').replace(/[-\s]/g, '') || null;
}

/**
 * Quita guiones y caracteres no alfanuméricos de una cédula.
 * Si es puramente numérica, también quita ceros iniciales (01-1753-0918 → 117530918).
 */
export function formatCedula(cedula: string | null | undefined): string | null {
  if (!cedula) return null;
  const limpio = cedula.replace(/[^a-zA-Z0-9]/g, '');
  if (/^\d+$/.test(limpio)) return limpio.replace(/^0+/, '') || limpio;
  return limpio || null;
}
