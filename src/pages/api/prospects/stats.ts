import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Obtener todas las cédulas que tienen cliente registrado
    const clientesExistentes = await prisma.client.findMany({
      select: { numeroIdentificacion: true },
    });
    const cedulasConCliente = new Set(clientesExistentes.map(c => c.numeroIdentificacion));

    if (session.role === 'admin') {
      const prospectos = await prisma.prospecto.findMany({
        select: {
          asignadoA: true,
          ultimoContacto: true,
          idCliente: true,
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
        convertidos: number;
      }>();

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
            convertidos: 0,
          });
        }
        const entry = map.get(uid)!;
        entry.totalProspectos++;

        const uc = p.ultimoContacto;
        if (uc && uc >= todayStart) entry.contactadosHoy++;
        if (!uc || uc < twoDaysAgo) entry.conAlerta++;
        if (p.idCliente && cedulasConCliente.has(p.idCliente)) entry.convertidos++;
      }

      return res.status(200).json({ stats: Array.from(map.values()) });
    } else {
      // Para usuario: contar prospects propios y cuántos tienen cliente
      const misProspectos = await prisma.prospecto.findMany({
        where: { asignadoA: session.userId },
        select: { ultimoContacto: true, idCliente: true },
      });

      let total = 0, conAlerta = 0, contactadosHoy = 0, convertidos = 0;
      for (const p of misProspectos) {
        total++;
        const uc = p.ultimoContacto;
        if (uc && uc >= todayStart) contactadosHoy++;
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
          contactadosHoy,
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
