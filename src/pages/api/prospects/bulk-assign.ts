import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Sin permiso' });
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Método no permitido' });

  const { ids, asignadoA } = req.body as { ids: string[]; asignadoA: string | null };
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un ID' });
  }

  try {
    const result = await prisma.prospecto.updateMany({
      where: { id: { in: ids } },
      data: { asignadoA: asignadoA || null, asignadoAt: asignadoA ? new Date() : null },
    });
    return res.status(200).json({ updated: result.count });
  } catch (error) {
    console.error('[bulk-assign] Error:', error);
    return res.status(500).json({ error: 'Error interno', detail: String(error) });
  }
}
