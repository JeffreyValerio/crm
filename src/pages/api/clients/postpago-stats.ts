import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'Not authenticated' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const groups = await prisma.client.groupBy({
    by: ['postpagoStatus'],
    where: { tipo: 'POSTPAGO' },
    _count: { _all: true },
  });

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const g of groups) {
    const key = g.postpagoStatus ?? 'null';
    byStatus[key] = g._count._all;
    total += g._count._all;
  }

  return res.status(200).json({
    total,
    pendienteActivacion: byStatus['PENDIENTE_ACTIVACION'] ?? 0,
    activada: byStatus['ACTIVADA'] ?? 0,
    pendienteMensajeria: byStatus['PENDIENTE_MENSAJERIA'] ?? 0,
  });
}
