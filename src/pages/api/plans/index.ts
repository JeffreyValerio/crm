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
    // Cualquier usuario autenticado puede ver planes
    try {
      const { productTypeId } = req.query;
      
      const where: any = {};
      if (productTypeId) {
        where.productTypeId = productTypeId as string;
      }

      const plans = await prisma.plan.findMany({
        where,
        include: {
          productType: true,
        },
        orderBy: {
          nombre: 'asc',
        },
      });

      return res.status(200).json({ plans });
    } catch (error) {
      console.error('Error fetching plans:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Solo admin puede crear planes
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'POST') {
    try {
      const { nombre, descripcion, activo, productTypeId } = req.body;

      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: 'El nombre del producto es requerido' });
      }

      if (!productTypeId) {
        return res.status(400).json({ error: 'El tipo de producto es requerido' });
      }

      const plan = await prisma.plan.create({
        data: {
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          activo: activo !== undefined ? activo : true,
          productTypeId: productTypeId,
        },
        include: {
          productType: true,
        },
      });

      return res.status(201).json({ plan });
    } catch (error) {
      console.error('Error creating plan:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
