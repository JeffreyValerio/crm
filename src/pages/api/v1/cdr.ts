import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiKeyAuth, parseDateParam } from '@/lib/api-key-auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { desde, hasta, extension, estado } = req.query;

  const desdeDate = parseDateParam(desde, res, 'desde');
  if (desdeDate === 'error') return;
  const hastaDate = parseDateParam(hasta, res, 'hasta');
  if (hastaDate === 'error') return;

  const where: Record<string, unknown> = {};

  if (desdeDate || hastaDate) {
    where.fecha = {
      ...(desdeDate ? { gte: desdeDate } : {}),
      ...(hastaDate ? { lte: hastaDate } : {}),
    };
  }

  if (extension && typeof extension === 'string') {
    where.extension = { contains: extension, mode: 'insensitive' };
  }

  if (estado && typeof estado === 'string') {
    where.estado = estado;
  }

  const registros = await prisma.cdrLlamada.findMany({
    where,
    select: {
      id: true,
      uuid: true,
      extension: true,
      direccion: true,
      cidNumero: true,
      destino: true,
      grabacionId: true,
      fecha: true,
      duracion: true,
      estado: true,
      causaColgar: true,
    },
    orderBy: { fecha: 'desc' },
  });

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ count: registros.length, data: registros });
}

export default withApiKeyAuth(handler);
