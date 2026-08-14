import { isAdmin } from '@/lib/roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import cloudinary from '@/lib/cloudinary';
import { hasPermiso } from '@/lib/permisos';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (!isAdmin(session.role)) return res.status(403).json({ error: 'Sin permiso' });

  const { id } = req.query;

  if (req.method === 'PATCH') {
    if (!(await hasPermiso(session.role, 'inventario_sim', 'asignar'))) {
      return res.status(403).json({ error: 'Sin permiso para actualizar SIMs' });
    }
    const { estado } = req.body;
    if (!['SIN_ASIGNAR', 'ASIGNADO'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    const sim = await prisma.simCard.update({ where: { id: id as string }, data: { estado } });
    return res.status(200).json({ sim });
  }

  if (req.method === 'DELETE') {
    if (!(await hasPermiso(session.role, 'inventario_sim', 'agregar'))) {
      return res.status(403).json({ error: 'Sin permiso para eliminar SIMs' });
    }
    const sim = await prisma.simCard.findUnique({ where: { id: id as string } });
    if (!sim) return res.status(404).json({ error: 'SIM no encontrada' });

    if (sim.fotoPublicId) {
      await cloudinary.uploader.destroy(sim.fotoPublicId).catch(() => {});
    }

    await prisma.simCard.delete({ where: { id: id as string } });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
