import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  if (req.method === 'GET') {
    const { year } = req.query;
    if (!year) {
      const all = await prisma.kpiMeta.findMany({ orderBy: { periodo: 'asc' } });
      return res.status(200).json({ metas: all });
    }

    const y = parseInt(year as string);
    const periodos = Array.from({ length: 12 }, (_, i) =>
      `${y}-${String(i + 1).padStart(2, '0')}`
    );

    const [globales, porUsuario] = await Promise.all([
      prisma.kpiMeta.findMany({ where: { periodo: { in: periodos } } }),
      prisma.userKpiMeta.findMany({ where: { periodo: { in: periodos } } }),
    ]);

    return res.status(200).json({ globales, porUsuario });
  }

  if (req.method === 'PUT') {
    if (session.role !== 'admin') return res.status(403).json({ error: 'Sin permiso' });

    const { periodo, meta, userId } = req.body;

    if (!periodo || typeof periodo !== 'string' || !/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'periodo debe tener formato YYYY-MM' });
    }
    if (meta === undefined || typeof meta !== 'number' || meta < 0) {
      return res.status(400).json({ error: 'meta debe ser un número >= 0' });
    }

    // userId presente → meta por usuario; ausente → meta global
    if (userId && typeof userId === 'string') {
      const kpi = await prisma.userKpiMeta.upsert({
        where: { userId_periodo: { userId, periodo } },
        update: { meta },
        create: { userId, periodo, meta },
      });
      return res.status(200).json({ kpi });
    }

    const kpi = await prisma.kpiMeta.upsert({
      where: { periodo },
      update: { meta },
      create: { periodo, meta },
    });
    return res.status(200).json({ kpi });
  }

  return res.status(405).end();
}
