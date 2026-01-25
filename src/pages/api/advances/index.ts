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

  if (req.method === 'GET') {
    try {
      const where: any = {};

      // Si no es admin, solo puede ver sus propios adelantos
      if (session.role !== 'admin') {
        where.userId = session.userId;
      } else {
        // Admin puede filtrar por usuario si se especifica
        const { userId: queryUserId, estado } = req.query;
        if (queryUserId) {
          where.userId = queryUserId as string;
        }
        if (estado) {
          where.estado = estado as string;
        }
      }

      const advances = await prisma.advance.findMany({
        where,
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
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json({ advances });
    } catch (error) {
      console.error('Error fetching advances:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { monto, observaciones } = req.body;

      if (!monto || monto <= 0) {
        return res.status(400).json({ error: 'El monto es requerido y debe ser mayor a 0' });
      }

      // Crear la solicitud de adelanto
      const advance = await prisma.advance.create({
        data: {
          userId: session.userId,
          monto: monto,
          quincenas: 1, // Por defecto 1 quincena, el admin lo modifica al aprobar
          montoRestante: monto, // Inicialmente todo el monto está pendiente
          estado: 'PENDIENTE',
          observaciones: observaciones || null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return res.status(201).json({
        message: 'Solicitud de adelanto creada correctamente',
        advance,
      });
    } catch (error) {
      console.error('Error creating advance:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
