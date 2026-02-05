import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { obtenerDesgloseAdelantos } from '@/lib/advance-details';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);

  if (!session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const payroll = await prisma.payroll.findUnique({
        where: { id: id as string },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nombre: true,
              apellidos: true,
              role: true,
            },
          },
          aprobador: {
            select: {
              id: true,
              email: true,
              nombre: true,
              apellidos: true,
            },
          },
        },
      });

      if (!payroll) {
        return res.status(404).json({ error: 'Nómina no encontrada' });
      }

      // Solo el admin o el dueño de la nómina pueden verla
      if (session.role !== 'admin' && payroll.userId !== session.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Obtener desglose de adelantos (si aplican)
      const adelantosDesglose = await obtenerDesgloseAdelantos(
        payroll.userId,
        payroll.periodo,
        payroll.quincena
      );

      return res.status(200).json({ 
        payroll: {
          ...payroll,
          adelantosDesglose,
        }
      });
    } catch (error) {
      console.error('Error fetching payroll:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    // Solo admin puede actualizar nóminas
    if (session.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      const { estado, fechaPago, observaciones } = req.body;

      const updateData: any = {};
      if (estado !== undefined) {
        updateData.estado = estado;
        // Si se marca como PAGADO, establecer fechaPago si no existe
        if (estado === 'PAGADO' && !fechaPago) {
          updateData.fechaPago = new Date();
        }
      }
      if (fechaPago !== undefined) {
        updateData.fechaPago = fechaPago ? new Date(fechaPago) : null;
      }
      if (observaciones !== undefined) {
        updateData.observaciones = observaciones || null;
      }

      const payroll = await prisma.payroll.update({
        where: { id: id as string },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nombre: true,
              apellidos: true,
            },
          },
          aprobador: {
            select: {
              id: true,
              email: true,
              nombre: true,
              apellidos: true,
            },
          },
        },
      });

      return res.status(200).json({ payroll });
    } catch (error) {
      console.error('Error updating payroll:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
