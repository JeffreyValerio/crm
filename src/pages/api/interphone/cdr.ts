import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  const { desde, hasta, extension, estado, search, page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(200, parseInt(limit as string) || 50);
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};

  if (desde && typeof desde === 'string') {
    where.fecha = { ...(where.fecha as object ?? {}), gte: new Date(desde) };
  }
  if (hasta && typeof hasta === 'string') {
    where.fecha = { ...(where.fecha as object ?? {}), lt: new Date(hasta) };
  }

  if (extension && typeof extension === 'string') {
    where.extension = { contains: extension, mode: 'insensitive' };
  }

  if (estado && typeof estado === 'string') {
    where.estado = estado;
  }

  if (search && typeof search === 'string') {
    const s = search.trim();
    where.OR = [
      { destino: { contains: s } },
      { cidNumero: { contains: s } },
      { extension: { contains: s, mode: 'insensitive' } },
    ];
  }

  const [total, registros] = await Promise.all([
    prisma.cdrLlamada.count({ where }),
    prisma.cdrLlamada.findMany({
      where,
      orderBy: { fecha: 'desc' },
      skip,
      take: limitNum,
    }),
  ]);

  return res.status(200).json({
    registros,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
}
