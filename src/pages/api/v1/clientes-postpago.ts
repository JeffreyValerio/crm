import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiKeyAuth, parseDateParam } from '@/lib/api-key-auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { desde, hasta } = req.query;

  const desdeDate = parseDateParam(desde, res, 'desde');
  if (desdeDate === 'error') return;
  const hastaDate = parseDateParam(hasta, res, 'hasta');
  if (hastaDate === 'error') return;

  const where: Record<string, unknown> = { tipo: 'POSTPAGO' };
  if (desdeDate || hastaDate) {
    where.createdAt = {
      ...(desdeDate ? { gte: desdeDate } : {}),
      ...(hastaDate ? { lte: hastaDate } : {}),
    };
  }

  const clients = await prisma.client.findMany({
    where,
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      tipoIdentificacion: true,
      email: true,
      provincia: true,
      canton: true,
      distrito: true,
      postpagoStatus: true,
      createdAt: true,
      updatedAt: true,
      plan: {
        select: {
          nombre: true,
          productType: { select: { nombre: true } },
        },
      },
      creator: { select: { id: true, nombre: true, apellidos: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const data = clients.map(c => ({
    id: c.id,
    nombres: c.nombres,
    apellidos: c.apellidos,
    tipoIdentificacion: c.tipoIdentificacion,
    email: c.email,
    provincia: c.provincia,
    canton: c.canton,
    distrito: c.distrito,
    estadoPostpago: c.postpagoStatus,
    plan: c.plan?.nombre ?? null,
    tipoPlan: c.plan?.productType?.nombre ?? null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    vendedorId: c.creator.id,
    vendedorNombre: `${c.creator.nombre ?? ''} ${c.creator.apellidos ?? ''}`.trim() || c.creator.id,
  }));

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ count: data.length, data });
}

export default withApiKeyAuth(handler);
