import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiKeyAuth } from '@/lib/api-key-auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { desde, hasta } = req.query;

  const where: Record<string, unknown> = {};
  if (desde || hasta) {
    where.asignadoAt = {
      ...(desde ? { gte: new Date(desde as string) } : {}),
      ...(hasta ? { lte: new Date(hasta as string) } : {}),
    };
  }

  const prospectos = await prisma.prospecto.findMany({
    where,
    select: {
      id: true,
      nroOrden: true,
      estado: true,
      cliente: true,
      provincia: true,
      canton: true,
      distrito: true,
      telCelular: true,
      metodoContacto: true,
      totalContactos: true,
      ultimoContacto: true,
      proveedorCompetidor: true,
      asignadoAt: true,
      createdAt: true,
      updatedAt: true,
      asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
    },
    orderBy: { asignadoAt: 'desc' },
  });

  const data = prospectos.map(p => ({
    id: p.id,
    nroOrden: p.nroOrden,
    estadoOrden: p.estado,
    cliente: p.cliente,
    provincia: p.provincia,
    canton: p.canton,
    distrito: p.distrito,
    telCelular: p.telCelular,
    tipificacion: p.metodoContacto,
    totalContactos: p.totalContactos,
    ultimoContacto: p.ultimoContacto,
    proveedorCompetidor: p.proveedorCompetidor,
    asignadoAt: p.asignadoAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    vendedorId: p.asignado?.id ?? null,
    vendedorNombre: p.asignado
      ? `${p.asignado.nombre ?? ''} ${p.asignado.apellidos ?? ''}`.trim() || p.asignado.email
      : null,
    vendedorEmail: p.asignado?.email ?? null,
  }));

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ count: data.length, data });
}

export default withApiKeyAuth(handler);
