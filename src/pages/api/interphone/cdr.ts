import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  const { fecha, extension, estado, search, page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(200, parseInt(limit as string) || 50);
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};

  // Filtro por fecha (día completo en UTC)
  if (fecha && typeof fecha === 'string') {
    const d = new Date(fecha);
    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);
    where.fecha = { gte: d, lt: nextDay };
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
