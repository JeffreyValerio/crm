import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  const now = new Date();
  const year = parseInt((req.query.year as string) || now.getFullYear().toString(), 10);
  const month = parseInt((req.query.month as string) || (now.getMonth() + 1).toString(), 10);

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  try {
    const where: any = {
      ultimoContacto: { gte: monthStart, lt: monthEnd },
    };
    if (session.role !== 'admin') {
      where.asignadoA = session.userId;
    } else if (req.query.asignadoA) {
      where.asignadoA = req.query.asignadoA;
    }

    const prospectos = await prisma.prospecto.findMany({
      where,
      select: { ultimoContacto: true, metodoContacto: true },
    });

    // Agrupar por día (UTC-6 Costa Rica)
    const daysInMonth = new Date(year, month, 0).getDate();
    const porDiaMap = new Map<string, number>();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      porDiaMap.set(key, 0);
    }

    // Agrupar por tipificación
    const porTipificacionMap = new Map<string, number>();

    for (const p of prospectos) {
      if (p.ultimoContacto) {
        // Costa Rica es UTC-6
        const local = new Date(p.ultimoContacto.getTime() - 6 * 60 * 60 * 1000);
        const key = local.toISOString().split('T')[0];
        if (porDiaMap.has(key)) {
          porDiaMap.set(key, (porDiaMap.get(key) ?? 0) + 1);
        }
      }
      if (p.metodoContacto) {
        porTipificacionMap.set(
          p.metodoContacto,
          (porTipificacionMap.get(p.metodoContacto) ?? 0) + 1,
        );
      }
    }

    const porDia = Array.from(porDiaMap.entries()).map(([fecha, contactos]) => ({
      fecha,
      dia: parseInt(fecha.split('-')[2], 10),
      contactos,
    }));

    const porTipificacion = Array.from(porTipificacionMap.entries())
      .map(([tipificacion, count]) => ({ tipificacion, count }))
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({ porDia, porTipificacion });
  } catch (error) {
    console.error('[prospects/activity]', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
