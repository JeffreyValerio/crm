import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiKeyAuth } from '@/lib/api-key-auth';

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const equipos = await prisma.equipo.findMany({
    select: {
      id: true,
      nombre: true,
      createdAt: true,
      teamLead: { select: { id: true, nombre: true, apellidos: true } },
      miembros: {
        select: {
          user: { select: { id: true, nombre: true, apellidos: true, extension: true } },
        },
      },
    },
    orderBy: { nombre: 'asc' },
  });

  const data = equipos.map(e => ({
    id: e.id,
    nombre: e.nombre,
    createdAt: e.createdAt,
    teamLeadId: e.teamLead?.id ?? null,
    teamLeadNombre: e.teamLead
      ? `${e.teamLead.nombre ?? ''} ${e.teamLead.apellidos ?? ''}`.trim()
      : null,
    miembros: e.miembros.map(m => ({
      id: m.user.id,
      nombre: `${m.user.nombre ?? ''} ${m.user.apellidos ?? ''}`.trim(),
      extension: m.user.extension,
    })),
    totalMiembros: e.miembros.length,
  }));

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ count: data.length, data });
}

export default withApiKeyAuth(handler);
