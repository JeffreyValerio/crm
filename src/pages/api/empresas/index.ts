import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { isSuperAdmin } from '@/lib/roles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (!isSuperAdmin(session.role)) return res.status(403).json({ error: 'Sin permiso' });

  if (req.method === 'GET') {
    const empresas = await prisma.empresa.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { equipos: true, usuarios: true } },
        usuarios: {
          where: { role: 'admin' },
          select: { id: true, nombre: true, apellidos: true, email: true },
          orderBy: { nombre: 'asc' },
        },
      },
    });

    return res.status(200).json({ empresas });
  }

  if (req.method === 'POST') {
    const { nombre } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' });

    const empresa = await prisma.empresa.create({
      data: { nombre: nombre.trim() },
    });

    return res.status(201).json({ empresa });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
