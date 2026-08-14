import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { getPermisosRol } from '@/lib/permisos';

/**
 * GET /api/mis-permisos
 *
 * Devuelve los permisos del usuario autenticado (rol actual) mergeados con defaults.
 * Úsalo en el cliente para filtrar navegación y botones sin exponer lógica de roles.
 *
 * Respuesta: { permisos: Record<pantalla, string[]> }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  const permisos = await getPermisosRol(session.role ?? '');

  return res.status(200).json({ permisos });
}
