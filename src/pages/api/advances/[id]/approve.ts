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

  // Solo admin puede aprobar adelantos
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { quincenas } = req.body;

      if (!quincenas || quincenas < 1) {
        return res.status(400).json({ error: 'El número de quincenas debe ser al menos 1' });
      }

      // Verificar que el adelanto existe y está pendiente
      const advance = await prisma.advance.findUnique({
        where: { id: id as string },
      });

      if (!advance) {
        return res.status(404).json({ error: 'Adelanto no encontrado' });
      }

      if (advance.estado !== 'PENDIENTE') {
        return res.status(400).json({ error: 'Solo se pueden aprobar adelantos pendientes' });
      }

      // Calcular el monto por quincena
      const montoNum = Number(advance.monto);
      const montoPorQuincena = Math.round(montoNum / quincenas);

      // Actualizar el adelanto
      const updatedAdvance = await prisma.advance.update({
        where: { id: id as string },
        data: {
          estado: 'APROBADO',
          quincenas: quincenas,
          montoRestante: advance.monto, // El monto restante es el total, se descontará progresivamente
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
        message: 'Adelanto aprobado correctamente',
        advance: updatedAdvance,
      });
    } catch (error) {
      console.error('Error approving advance:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
