import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  const sim = await prisma.simCard.findFirst({
    where: { estado: 'SIN_ASIGNAR' },
    orderBy: { numero: 'asc' },
  });

  if (!sim) return res.status(404).json({ error: 'No hay SIMs disponibles' });

  return res.status(200).json({ sim });
}
