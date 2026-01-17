import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);

  if (!session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Solo admin puede aprobar nóminas
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      // Verificar que la nómina existe
      const payroll = await prisma.payroll.findUnique({
        where: { id: id as string },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!payroll) {
        return res.status(404).json({ error: 'Nómina no encontrada' });
      }

      // Verificar que no esté ya aprobada
      if (payroll.estado === 'APROBADO') {
        return res.status(400).json({ error: 'Esta nómina ya está aprobada' });
      }

      // Verificar que no esté pagada
      if (payroll.estado === 'PAGADO') {
        return res.status(400).json({ error: 'Esta nómina ya está pagada' });
      }

      // Aprobar la nómina
      const updatedPayroll = await prisma.payroll.update({
        where: { id: id as string },
        data: {
          estado: 'APROBADO',
          aprobadoPor: session.userId,
          aprobadoAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          aprobador: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      return res.status(200).json({
        message: 'Nómina aprobada correctamente',
        payroll: updatedPayroll,
      });
    } catch (error) {
      console.error('Error approving payroll:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
