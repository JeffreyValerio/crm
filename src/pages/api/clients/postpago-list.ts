import { isAdmin, isSuperAdmin } from '@/lib/roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { hasPermiso } from '@/lib/permisos';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'Not authenticated' });
  if (!isAdmin(session.role)) return res.status(403).json({ error: 'Forbidden' });
  if (!(await hasPermiso(session.role, 'clientes_postpago', 'ver'))) {
    return res.status(403).json({ error: 'Sin permiso para ver clientes postpago' });
  }

  const where: any = { tipo: 'POSTPAGO' };

  if (isSuperAdmin(session.role)) {
    // Superadmin: puede filtrar por empresa vía ?empresaId=
    const { empresaId } = req.query;
    if (empresaId && typeof empresaId === 'string') {
      // Obtener IDs de usuarios de esa empresa
      const empresaUsers = await prisma.user.findMany({
        where: { empresaId },
        select: { id: true },
      });
      where.createdBy = { in: empresaUsers.map(u => u.id) };
    }
    // Sin filtro: ve todos
  } else {
    // Admin: solo clientes creados por usuarios de su empresa
    const me = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { empresaId: true },
    });
    if (me?.empresaId) {
      const empresaUsers = await prisma.user.findMany({
        where: { empresaId: me.empresaId },
        select: { id: true },
      });
      where.createdBy = { in: empresaUsers.map(u => u.id) };
    } else {
      // Admin sin empresa: solo sus propios clientes
      where.createdBy = session.userId;
    }
  }

  const clients = await prisma.client.findMany({
    where,
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      telefono: true,
      email: true,
      numeroIdentificacion: true,
      postpagoStatus: true,
      tipoPlanPostpago: true,
      cedulaFrontalUrl: true,
      cedulaTraseraUrl: true,
      selfieUrl: true,
      simCedulaUrl: true,
      simUrl: true,
      createdAt: true,
      plan: {
        select: {
          nombre: true,
          productType: { select: { nombre: true } },
        },
      },
      creator: {
        select: { nombre: true, apellidos: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({ clients });
}
