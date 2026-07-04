import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  // GET: obtener metas (todos o filtrado por periodo)
  if (req.method === 'GET') {
    const { periodo } = req.query;
    if (periodo && typeof periodo === 'string') {
      const kpi = await prisma.kpiMeta.findUnique({ where: { periodo } });
      return res.status(200).json({ meta: kpi?.meta ?? null });
    }
    const all = await prisma.kpiMeta.findMany({ orderBy: { periodo: 'asc' } });
    return res.status(200).json({ metas: all });
  }

  // PUT: solo admin puede setear metas
  if (req.method === 'PUT') {
    if (session.role !== 'admin') return res.status(403).json({ error: 'Sin permiso' });

    const { periodo, meta } = req.body;
    if (!periodo || typeof periodo !== 'string' || !/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'periodo debe tener formato YYYY-MM' });
    }
    if (!meta || typeof meta !== 'number' || meta < 1) {
      return res.status(400).json({ error: 'meta debe ser un número mayor a 0' });
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
