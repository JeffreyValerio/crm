import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

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
      const advance = await prisma.advance.findUnique({
        where: { id: id as string },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          aprobador: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!advance) {
        return res.status(404).json({ error: 'Adelanto no encontrado' });
      }

      // Solo el admin o el dueño del adelanto pueden verlo
      if (session.role !== 'admin' && advance.userId !== session.userId) {
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
