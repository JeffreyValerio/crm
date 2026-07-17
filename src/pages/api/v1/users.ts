import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiKeyAuth } from '@/lib/api-key-auth';

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      nombre: true,
      apellidos: true,
      email: true,
      role: true,
      extension: true,
      createdAt: true,
    },
    orderBy: { nombre: 'asc' },
  });

  const data = users.map(u => ({
    id: u.id,
    nombre: u.nombre,
    apellidos: u.apellidos,
    email: u.email,
    rol: u.role,
    extension: u.extension,
    createdAt: u.createdAt,
  }));

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ count: data.length, data });
}

export default withApiKeyAuth(handler);
