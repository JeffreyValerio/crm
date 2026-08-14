import { isAdmin } from '@/lib/roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { hasPermiso } from '@/lib/permisos';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (!isAdmin(session.role)) return res.status(403).json({ error: 'Sin permiso' });

  if (req.method === 'GET') {
    if (!(await hasPermiso(session.role, 'inventario_sim', 'ver'))) {
      return res.status(403).json({ error: 'Sin permiso para ver el inventario de SIMs' });
    }
    const sims = await prisma.simCard.findMany({ orderBy: { numero: 'asc' } });
    return res.status(200).json({ sims });
  }

  if (req.method === 'POST') {
    if (!(await hasPermiso(session.role, 'inventario_sim', 'agregar'))) {
      return res.status(403).json({ error: 'Sin permiso para agregar SIMs' });
    }

    const { numero, fotoUrl, fotoPublicId } = req.body;
    if (!numero?.trim()) return res.status(400).json({ error: 'El número de SIM es requerido' });

    const existing = await prisma.simCard.findUnique({ where: { numero: numero.trim() } });
    if (existing) return res.status(409).json({ error: 'Ya existe una SIM con ese número' });

    const sim = await prisma.simCard.create({
      data: { numero: numero.trim(), fotoUrl: fotoUrl || null, fotoPublicId: fotoPublicId || null },
    });
    return res.status(201).json({ sim });
  }

  return res.status(405).end();
}
