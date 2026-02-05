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

  // Solo admin puede actualizar días trabajados
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { diasTrabajados } = req.body;

      if (typeof diasTrabajados !== 'number' || diasTrabajados < 0) {
        return res.status(400).json({ error: 'Los días trabajados deben ser un número mayor o igual a 0' });
      }

      // Verificar que la nómina existe
      const payroll = await prisma.payroll.findUnique({
        where: { id: id as string },
      });

      if (!payroll) {
        return res.status(404).json({ error: 'Nómina no encontrada' });
      }

      // No permitir modificar días si ya está pagada
      if (payroll.estado === 'PAGADO') {
        return res.status(400).json({ error: 'No se pueden modificar los días de una nómina ya pagada' });
      }

      // El total siempre es 200,000, independientemente de los días trabajados
      const total = 200000;

      // Actualizar la nómina
      const updatedPayroll = await prisma.payroll.update({
        where: { id: id as string },
        data: {
          diasTrabajados: diasTrabajados,
          montoDiario: 0, // No se usa
          total: total, // Siempre 200,000
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
        message: 'Días trabajados actualizados correctamente',
        payroll: updatedPayroll,
      });
    } catch (error) {
      console.error('Error updating payroll days:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
