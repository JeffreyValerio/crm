import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID inválido' });

  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Método no permitido' });

  const { metodo } = req.body;
  if (!metodo || !['LLAMADA', 'WHATSAPP'].includes(metodo)) {
    return res.status(400).json({ error: 'metodo debe ser LLAMADA o WHATSAPP' });
  }

  const prospecto = await prisma.prospecto.findUnique({ where: { id } });
  if (!prospecto) return res.status(404).json({ error: 'No encontrado' });

  if (session.role !== 'admin' && prospecto.asignadoA !== session.userId) {
    return res.status(403).json({ error: 'Sin acceso' });
  }

  const updated = await prisma.prospecto.update({
    where: { id },
    data: {
      metodoContacto: metodo,
      totalContactos: { increment: 1 },
      ultimoContacto: new Date(),
    },
    include: {
      asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
    },
  });

  return res.status(200).json({ prospecto: updated });
}
