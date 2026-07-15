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

  if (req.method === 'GET') {
    const equipos = await prisma.equipo.findMany({
      include: INCLUDE,
      orderBy: { nombre: 'asc' },
    });
    return res.status(200).json({ equipos });
  }

  if (req.method === 'POST') {
    const { nombre, teamLeadId, miembrosIds } = req.body as {
      nombre: string;
      teamLeadId?: string;
      miembrosIds?: string[];
    };

    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

    const equipo = await prisma.equipo.create({
      data: {
        nombre: nombre.trim(),
        teamLeadId: teamLeadId || null,
        miembros: miembrosIds?.length
          ? { create: miembrosIds.map(userId => ({ userId })) }
          : undefined,
      },
      include: INCLUDE,
    });

    return res.status(201).json({ equipo });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
