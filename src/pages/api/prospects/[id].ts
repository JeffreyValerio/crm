import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID inválido' });

  if (req.method === 'GET') {
    const prospecto = await prisma.prospecto.findUnique({
      where: { id },
      include: {
        asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
      },
    });
    if (!prospecto) return res.status(404).json({ error: 'No encontrado' });

    if (session.role !== 'admin' && prospecto.asignadoA !== session.userId) {
      return res.status(403).json({ error: 'Sin acceso' });
    }

    return res.status(200).json({ prospecto });
  }

  if (req.method === 'PATCH') {
    if (session.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });

    const { asignadoA, observacionesInternas } = req.body;

    const data: any = {};
    if (asignadoA !== undefined) data.asignadoA = asignadoA || null;
    if (observacionesInternas !== undefined) data.observacionesInternas = observacionesInternas;

    const prospecto = await prisma.prospecto.update({
      where: { id },
      data,
      include: {
        asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
      },
    });

    return res.status(200).json({ prospecto });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
