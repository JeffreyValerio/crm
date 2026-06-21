import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  if (req.method === 'GET') {
    try {
    const { search, asignadoA, page = '1', limit = '15' } = req.query;

    const where: any = {};

    // Control de acceso
    if (session.role !== 'admin') {
      where.asignadoA = session.userId;
    } else if (asignadoA) {
      where.asignadoA = asignadoA === 'sin_asignar' ? null : asignadoA;
    }

    // Búsqueda por texto
    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      const searchConds = [
        { cliente: { contains: s, mode: 'insensitive' } },
        { nroOrden: { contains: s, mode: 'insensitive' } },
        { idCliente: { contains: s, mode: 'insensitive' } },
        { telCelular: { contains: s, mode: 'insensitive' } },
        { telOficina: { contains: s, mode: 'insensitive' } },
        { despacho: { contains: s, mode: 'insensitive' } },
      ];
      if (Object.keys(where).length > 0) {
        where.AND = [{ ...where }, { OR: searchConds }];
        Object.keys(where).forEach(k => { if (k !== 'AND') delete where[k]; });
      } else {
        where.OR = searchConds;
      }
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [total, prospectos] = await Promise.all([
      prisma.prospecto.count({ where }),
      prisma.prospecto.findMany({
        where,
        include: {
          asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
        },
        orderBy: [
          { asignadoAt: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
        skip,
        take: limitNum,
      }),
    ]);

    return res.status(200).json({
      prospectos,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
    } catch (error) {
      console.error('Error fetching prospectos:', error);
      return res.status(500).json({ error: 'Error interno del servidor', detail: String(error) });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
