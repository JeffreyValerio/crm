import { isAdmin } from '@/lib/roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { hasPermiso } from '@/lib/permisos';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);

  if (!session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      if (!(await hasPermiso(session.role, 'adelantos', 'ver'))) {
        return res.status(403).json({ error: 'Sin permiso para ver adelantos' });
      }

      const advance = await prisma.advance.findUnique({
        where: { id: id as string },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nombre: true,
              apellidos: true,
              role: true,
            },
          },
          aprobador: {
            select: {
              id: true,
              email: true,
              nombre: true,
              apellidos: true,
            },
          },
        },
      });

      if (!advance) {
        return res.status(404).json({ error: 'Adelanto no encontrado' });
      }

      // Solo el admin o el dueño del adelanto pueden verlo
      if (!isAdmin(session.role) && advance.userId !== session.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      return res.status(200).json({ advance });
    } catch (error) {
      console.error('Error fetching advance:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
