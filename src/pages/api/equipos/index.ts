import { isAdmin, isSuperAdmin } from '@/lib/roles';
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
  if (!isAdmin(session.role)) return res.status(403).json({ error: 'Sin acceso' });

  // Obtener empresaId del admin (superadmin ve todo)
  let empresaId: string | null = null;
  if (!isSuperAdmin(session.role)) {
    const me = await prisma.user.findUnique({ where: { id: session.userId }, select: { empresaId: true } });
    empresaId = me?.empresaId ?? null;
  }

  if (req.method === 'GET') {
    const equipos = await prisma.equipo.findMany({
      where: empresaId ? { empresaId } : undefined,
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
        empresaId: empresaId || null,
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
