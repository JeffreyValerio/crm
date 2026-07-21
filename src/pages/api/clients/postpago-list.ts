import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'Not authenticated' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const clients = await prisma.client.findMany({
    where: { tipo: 'POSTPAGO' },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      telefono: true,
      email: true,
      numeroIdentificacion: true,
      postpagoStatus: true,
      cedulaFrontalUrl: true,
      cedulaTraseraUrl: true,
      selfieUrl: true,
      simCedulaUrl: true,
      simUrl: true,
      createdAt: true,
      plan: {
        select: {
          nombre: true,
          productType: { select: { nombre: true } },
        },
      },
      creator: {
        select: { nombre: true, apellidos: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({ clients });
}
