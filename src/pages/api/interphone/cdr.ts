import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

interface VinculoInfo {
  tipo: 'prospecto' | 'cliente';
  id: string;
  nombre: string;
}

function normalize(tel: string | null | undefined): string {
  return (tel ?? '').replace(/\D/g, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  const { desde, hasta, extension, estado, search, page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(200, parseInt(limit as string) || 50);
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};

  if (desde && typeof desde === 'string') {
    where.fecha = { ...(where.fecha as object ?? {}), gte: new Date(desde) };
  }
  if (hasta && typeof hasta === 'string') {
    where.fecha = { ...(where.fecha as object ?? {}), lt: new Date(hasta) };
  }

  if (extension && typeof extension === 'string') {
    where.extension = { contains: extension, mode: 'insensitive' };
  }

  if (estado && typeof estado === 'string') {
    where.estado = estado;
  }

  if (search && typeof search === 'string') {
    const s = search.trim();
    where.OR = [
      { destino: { contains: s } },
      { cidNumero: { contains: s } },
      { extension: { contains: s, mode: 'insensitive' } },
    ];
  }

  const [total, registros] = await Promise.all([
    prisma.cdrLlamada.count({ where }),
    prisma.cdrLlamada.findMany({
      where,
      orderBy: { fecha: 'desc' },
      skip,
      take: limitNum,
    }),
  ]);

  // Lookup de vínculos: busca prospectos/clientes que coincidan con los destinos de esta página
  const destinos = [...new Set(registros.map(r => r.destino).filter(Boolean))];
  const vinculoMap: Record<string, VinculoInfo> = {};

  if (destinos.length > 0) {
    const [prospectos, clientes] = await Promise.all([
      prisma.prospecto.findMany({
        where: {
          OR: [
            { telCelular: { in: destinos } },
            { telInstalacion: { in: destinos } },
            { telOficina: { in: destinos } },
          ],
        },
        select: { id: true, nroOrden: true, cliente: true, telCelular: true, telInstalacion: true, telOficina: true },
      }),
      prisma.client.findMany({
        where: { telefono: { in: destinos } },
        select: { id: true, nombres: true, apellidos: true, telefono: true },
      }),
    ]);

    for (const c of clientes) {
      const tel = normalize(c.telefono);
      if (tel) vinculoMap[tel] = { tipo: 'cliente', id: c.id, nombre: `${c.nombres} ${c.apellidos}` };
    }
    for (const p of prospectos) {
      for (const phone of [p.telCelular, p.telInstalacion, p.telOficina]) {
        const tel = normalize(phone);
        if (tel && !vinculoMap[tel]) {
          vinculoMap[tel] = { tipo: 'prospecto', id: p.id, nombre: p.cliente ?? p.nroOrden };
          break;
        }
      }
    }
  }

  const enriched = registros.map(r => ({
    ...r,
    vinculo: vinculoMap[normalize(r.destino)] ?? null,
  }));

  return res.status(200).json({
    registros: enriched,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
}
