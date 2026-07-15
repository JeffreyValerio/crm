import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

const INCLUDE = {
  teamLead: { select: { id: true, nombre: true, apellidos: true, email: true } },
  miembros: {
    include: { user: { select: { id: true, nombre: true, apellidos: true, email: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Sin acceso' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID inválido' });

  if (req.method === 'PUT') {
    const { nombre, teamLeadId, miembrosIds } = req.body as {
      nombre?: string;
      teamLeadId?: string | null;
      miembrosIds?: string[];
    };

    const equipo = await prisma.equipo.update({
      where: { id },
      data: {
        ...(nombre !== undefined ? { nombre: nombre.trim() } : {}),
        ...(teamLeadId !== undefined ? { teamLeadId: teamLeadId || null } : {}),
        ...(miembrosIds !== undefined
          ? {
              miembros: {
                deleteMany: {},
                create: miembrosIds.map(userId => ({ userId })),
              },
            }
          : {}),
      },
      include: INCLUDE,
    });

    return res.status(200).json({ equipo });
  }

  if (req.method === 'DELETE') {
    await prisma.equipo.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
