import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiKeyAuth, parseDateParam } from '@/lib/api-key-auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { desde, hasta } = req.query;

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

  const stats = await prisma.extensionStats.findMany({
    where,
    select: {
      id: true,
      extension: true,
      fecha: true,
      respondido: true,
      perdidas: true,
      llamadasEntrantes: true,
      duracionInboundSeg: true,
      llamadasSalientes: true,
      duracionSalidaSeg: true,
      correoVoz: true,
      sinRespuesta: true,
      ocupado: true,
    },
    orderBy: [{ fecha: 'desc' }, { extension: 'asc' }],
  });

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ count: stats.length, data: stats });
}

export default withApiKeyAuth(handler);
