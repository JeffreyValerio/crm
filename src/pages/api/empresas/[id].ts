import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { isSuperAdmin } from '@/lib/roles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (!isSuperAdmin(session.role)) return res.status(403).json({ error: 'Sin permiso' });

  const { id } = req.query;

  if (req.method === 'PUT') {
    const { nombre } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' });

    const empresa = await prisma.empresa.update({
      where: { id: id as string },
      data: { nombre: nombre.trim() },
    });

    return res.status(200).json({ empresa });
  }

  if (req.method === 'DELETE') {
    // Desligar usuarios y equipos antes de eliminar
    await prisma.user.updateMany({ where: { empresaId: id as string }, data: { empresaId: null } });
    await prisma.equipo.updateMany({ where: { empresaId: id as string }, data: { empresaId: null } });
    await prisma.empresa.delete({ where: { id: id as string } });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
