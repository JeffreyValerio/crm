import { isAdmin } from '@/lib/roles';
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

  if (!isAdmin(session.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'GET') {
    try {
      // Admin solo ve usuarios de su empresa; superadmin ve todos
      let empresaFilter: { empresaId: string } | undefined;
      if (session.role === 'admin') {
        const me = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { empresaId: true },
        });
        if (me?.empresaId) {
          empresaFilter = { empresaId: me.empresaId };
        }
      }

      const users = await prisma.user.findMany({
        where: empresaFilter,
        select: {
          id: true,
          email: true,
          nombre: true,
          apellidos: true,
          role: true,
          password: true,
          inviteToken: true,
          invitedAt: true,
          extension: true,
          codigoVendedor: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json({ users });
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}