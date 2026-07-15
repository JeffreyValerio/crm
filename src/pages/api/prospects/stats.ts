import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { resolveEquipoUserIds } from '@/lib/equipo-filter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const now = new Date();
    const year = parseInt((req.query.year as string) || now.getFullYear().toString(), 10);
    const month = parseInt((req.query.month as string) || (now.getMonth() + 1).toString(), 10);

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Obtener todas las cédulas que tienen cliente registrado
    const clientesExistentes = await prisma.client.findMany({
      select: { numeroIdentificacion: true },
    });
    const cedulasConCliente = new Set(clientesExistentes.map(c => c.numeroIdentificacion));

    if (session.role === 'admin') {
      const asignadoAFilter = req.query.asignadoA as string | undefined;
      const equipoId = req.query.equipoId as string | undefined;
      const filtrarPorMes = !!(req.query.month as string);
      const whereAdmin: Record<string, unknown> = {};
      if (filtrarPorMes) whereAdmin.createdAt = { gte: monthStart, lt: monthEnd };
      if (asignadoAFilter) {
        whereAdmin.asignadoA = asignadoAFilter;
      } else if (equipoId) {
        const ids = await resolveEquipoUserIds(equipoId);
        whereAdmin.asignadoA = ids ? { in: ids } : '__NO_MATCH__';
      }
      const prospectos = await prisma.prospecto.findMany({ where: whereAdmin });

      // Cargar usuarios asignados por separado
      const userIds = [...new Set(prospectos.map(p => p.asignadoA).filter((id): id is string => !!id))];
      const usuarios = userIds.length > 0 ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, nombre: true, apellidos: true, email: true },
      }) : [];
      const usuariosMap = new Map(usuarios.map(u => [u.id, u]));

      const map = new Map<string, {
        userId: string;
        nombre: string | null;
        apellidos: string | null;
        email: string;
        totalProspectos: number;
        contactadosMes: number;
        conAlerta: number;
        convertidos: number;
      }>();

      for (const p of prospectos) {
        if (!p.asignadoA) continue;
        const uid = p.asignadoA;
        const usuario = usuariosMap.get(uid);
        if (!map.has(uid)) {
          map.set(uid, {
            userId: uid,
            nombre: usuario?.nombre ?? null,
            apellidos: usuario?.apellidos ?? null,
            email: usuario?.email ?? '',
            totalProspectos: 0,
            contactadosMes: 0,
            conAlerta: 0,
            convertidos: 0,
          });
        }
        const entry = map.get(uid)!;
        entry.totalProspectos++;

        const uc = (p as any).ultimoContacto as Date | null;
        if (uc && uc >= monthStart && uc < monthEnd) entry.contactadosMes++;
        if (!uc || uc < twoDaysAgo) entry.conAlerta++;
        const cedula = (p as any).idCliente as string | null;
        if (cedula && cedulasConCliente.has(cedula)) entry.convertidos++;
      }

      const sorted = Array.from(map.values()).sort((a, b) => {
        const na = `${a.nombre ?? ''} ${a.apellidos ?? ''}`.trim().toLowerCase();
        const nb = `${b.nombre ?? ''} ${b.apellidos ?? ''}`.trim().toLowerCase();
        return na.localeCompare(nb, 'es');
      });
      return res.status(200).json({ stats: sorted });
    } else {
      // Para usuario: sin select explícito para compatibilidad con Prisma client en dev
      const filtrarPorMes = !!(req.query.month as string);
      const misProspectos = await prisma.prospecto.findMany({
        where: {
          asignadoA: session.userId,
          ...(filtrarPorMes && { createdAt: { gte: monthStart, lt: monthEnd } }),
        },
      });

      let total = 0, conAlerta = 0, contactadosMes = 0, convertidos = 0;
      for (const p of misProspectos) {
        total++;
        const uc = p.ultimoContacto;
        if (uc && uc >= monthStart && uc < monthEnd) contactadosMes++;
        if (!uc || uc < twoDaysAgo) conAlerta++;
        if (p.idCliente && cedulasConCliente.has(p.idCliente)) convertidos++;
      }

      return res.status(200).json({
        stats: [{
          userId: session.userId,
          nombre: null,
          apellidos: null,
          email: '',
          totalProspectos: total,
          contactadosMes,
          conAlerta,
          convertidos,
        }],
      });
    }
  } catch (error) {
    console.error('[prospects/stats] Error:', error);
    return res.status(500).json({ error: 'Error interno', detail: String(error) });
  }
}
