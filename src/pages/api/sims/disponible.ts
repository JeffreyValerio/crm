import { isSuperAdmin } from '@/lib/roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  const { provincia } = req.query;

  const where: any = { estado: 'SIN_ASIGNAR' };
  if (provincia && typeof provincia === 'string') {
    where.provincia = provincia;
  }

  // Filtrar por empresa (vendedores y admins no superadmin)
  if (!isSuperAdmin(session.role)) {
    const me = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { empresaId: true },
    });
    where.empresaId = me?.empresaId ?? '__none__';
  }

  const sims = await prisma.simCard.findMany({
    where,
    orderBy: { numero: 'asc' },
    select: { id: true, numero: true, fotoUrl: true },
  });

  return res.status(200).json({ sims });
}
