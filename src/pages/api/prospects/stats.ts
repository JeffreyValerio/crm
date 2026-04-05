import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  if (session.role === 'admin') {
    const prospectos = await prisma.prospecto.findMany({
      select: {
        asignadoA: true,
        ultimoContacto: true,
        asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
      },
    });

    const map = new Map<string, {
      userId: string;
      nombre: string | null;
      apellidos: string | null;
      email: string;
      totalProspectos: number;
      contactadosHoy: number;
      conAlerta: number;
    }>();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const p of prospectos) {
      if (!p.asignadoA || !p.asignado) continue;
      const uid = p.asignadoA;
      if (!map.has(uid)) {
        map.set(uid, {
          userId: uid,
          nombre: p.asignado.nombre,
          apellidos: p.asignado.apellidos,
          email: p.asignado.email,
          totalProspectos: 0,
          contactadosHoy: 0,
          conAlerta: 0,
        });
      }
      const entry = map.get(uid)!;
      entry.totalProspectos++;

      const uc = p.ultimoContacto;
      if (uc && uc >= todayStart) entry.contactadosHoy++;
      if (!uc || uc < twoDaysAgo) entry.conAlerta++;
    }

    return res.status(200).json({ stats: Array.from(map.values()) });
  } else {
    const [total, conAlerta, contactadosHoy] = await Promise.all([
      prisma.prospecto.count({ where: { asignadoA: session.userId } }),
      prisma.prospecto.count({
        where: {
          asignadoA: session.userId,
          OR: [
            { ultimoContacto: null },
            { ultimoContacto: { lt: twoDaysAgo } },
          ],
        },
      }),
      prisma.prospecto.count({
        where: {
          asignadoA: session.userId,
          ultimoContacto: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return res.status(200).json({
      stats: [{
        userId: session.userId,
        nombre: null,
        apellidos: null,
        email: '',
        totalProspectos: total,
        contactadosHoy,
        conAlerta,
      }],
    });
  }
}
