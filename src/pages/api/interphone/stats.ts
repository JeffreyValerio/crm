import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'Not authenticated' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { fecha } = req.query;

  // Default: today
  const targetDate = fecha
    ? new Date(fecha as string)
    : new Date();

  const fechaUtc = new Date(Date.UTC(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  ));

  const [users, stats] = await Promise.all([
    prisma.user.findMany({
      where: { extension: { not: null } },
      select: { id: true, nombre: true, apellidos: true, email: true, extension: true },
      orderBy: { nombre: 'asc' },
    }),
    prisma.extensionStats.findMany({
      where: { fecha: fechaUtc },
      orderBy: { extension: 'asc' },
    }),
  ]);

  // Merge: attach user info to each stat row
  const statsMap = new Map(stats.map(s => [s.extension, s]));

  const rows = users.map(u => {
    const s = statsMap.get(u.extension!);
    return {
      userId: u.id,
      nombre: u.nombre && u.apellidos ? `${u.nombre} ${u.apellidos}` : u.email,
      extension: u.extension,
      respondido: s?.respondido ?? 0,
      perdidas: s?.perdidas ?? 0,
      correoVoz: s?.correoVoz ?? 0,
      sinRespuesta: s?.sinRespuesta ?? 0,
      ocupado: s?.ocupado ?? 0,
      alocSegundos: s?.alocSegundos ?? null,
      llamadasEntrantes: s?.llamadasEntrantes ?? 0,
      duracionInboundSeg: s?.duracionInboundSeg ?? 0,
      llamadasSalientes: s?.llamadasSalientes ?? 0,
      duracionSalidaSeg: s?.duracionSalidaSeg ?? 0,
      sinDatos: !s,
    };
  });

  return res.status(200).json({ rows, fecha: fechaUtc.toISOString().slice(0, 10) });
}
