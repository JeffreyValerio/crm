import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiKeyAuth } from '@/lib/api-key-auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { desde, hasta } = req.query;

  const where: Record<string, unknown> = {};
  if (desde || hasta) {
    where.createdAt = {
      ...(desde ? { gte: new Date(desde as string) } : {}),
      ...(hasta ? { lte: new Date(hasta as string) } : {}),
    };
  }

  const clients = await prisma.client.findMany({
    where,
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      tipoIdentificacion: true,
      numeroIdentificacion: true,
      provincia: true,
      canton: true,
      distrito: true,
      telefono: true,
      email: true,
      validationStatus: true,
      saleStatus: true,
      instaladaAt: true,
      assignedAt: true,
      createdAt: true,
      updatedAt: true,
      creator: { select: { id: true, nombre: true, apellidos: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const data = clients.map(c => ({
    id: c.id,
    nombres: c.nombres,
    apellidos: c.apellidos,
    tipoIdentificacion: c.tipoIdentificacion,
    numeroIdentificacion: c.numeroIdentificacion,
    provincia: c.provincia,
    canton: c.canton,
    distrito: c.distrito,
    telefono: c.telefono,
    email: c.email,
    estadoValidacion: c.validationStatus,
    estadoVenta: c.saleStatus,
    instaladaAt: c.instaladaAt,
    asignadoAt: c.assignedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    vendedorId: c.creator.id,
    vendedorNombre: `${c.creator.nombre ?? ''} ${c.creator.apellidos ?? ''}`.trim() || c.creator.email,
    vendedorEmail: c.creator.email,
  }));

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ count: data.length, data });
}

export default withApiKeyAuth(handler);
