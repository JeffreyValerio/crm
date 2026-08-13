import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (session.role !== 'user' && session.role !== 'teamlead') return res.status(403).json({ error: 'Sin permiso para solicitar prospectos' });

  const { tipo = 'GPON' } = req.body as { tipo?: string };
  const tipoValido = ['GPON', 'POSTPAGO', 'META'].includes(tipo) ? tipo : 'GPON';

  // Verificar que no tiene prospectos sin contactar del mismo tipo
  const sinContactar = await prisma.prospecto.count({
    where: { asignadoA: session.userId, totalContactos: 0, tipo: tipoValido },
  });

  if (sinContactar > 0) {
    return res.status(409).json({
      error: 'Tenés prospectos sin contactar. Contactalos antes de solicitar más.',
      sinContactar,
    });
  }

  // Obtener 10 prospectos sin asignar del tipo solicitado
  const disponibles = await prisma.prospecto.findMany({
    where: { asignadoA: null, tipo: tipoValido },
    select: { id: true },
    take: 10,
    orderBy: { createdAt: 'asc' },
  });

  if (disponibles.length === 0) {
    return res.status(404).json({ error: `No hay prospectos ${tipoValido} disponibles para asignar.` });
  }

  const ids = disponibles.map(p => p.id);

  await prisma.prospecto.updateMany({
    where: { id: { in: ids } },
    data: { asignadoA: session.userId, asignadoAt: new Date() },
  });

  return res.status(200).json({ asignados: ids.length, tipo: tipoValido });
}
