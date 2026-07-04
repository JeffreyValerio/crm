import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  // GET — público para todos los usuarios autenticados (necesario en prospects)
  if (req.method === 'GET') {
    const { soloActivas } = req.query;
    const tipificaciones = await prisma.tipificacion.findMany({
      where: soloActivas === 'true' ? { activa: true } : undefined,
      orderBy: { orden: 'asc' },
    });
    return res.status(200).json({ tipificaciones });
  }

  // Operaciones de escritura — solo admin
  if (session.role !== 'admin') return res.status(403).json({ error: 'Sin permiso' });

  // POST — crear nueva
  if (req.method === 'POST') {
    const { etiqueta, eliminaProspecto = false, creaCliente = false } = req.body;
    if (!etiqueta?.trim()) return res.status(400).json({ error: 'etiqueta es requerida' });

    const maxOrden = await prisma.tipificacion.aggregate({ _max: { orden: true } });
    const valor = etiqueta.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');

    const tip = await prisma.tipificacion.create({
      data: {
        valor: `CUSTOM_${valor}_${Date.now()}`,
        etiqueta: etiqueta.trim(),
        orden: (maxOrden._max.orden ?? 0) + 1,
        eliminaProspecto,
        creaCliente,
        activa: true,
      },
    });
    return res.status(201).json({ tipificacion: tip });
  }

  return res.status(405).end();
}
