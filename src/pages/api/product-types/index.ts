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
    // Cualquier usuario autenticado puede ver tipos de producto
    try {
      const productTypes = await prisma.productType.findMany({
        include: {
          products: {
            where: { activo: true },
          },
        },
        orderBy: {
          nombre: 'asc',
        },
      });

      return res.status(200).json({ productTypes });
    } catch (error) {
      console.error('Error fetching product types:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Solo admin puede crear tipos de producto
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'POST') {
    try {
      const { nombre, descripcion, activo } = req.body;

      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: 'El nombre del tipo de producto es requerido' });
      }

      const productType = await prisma.productType.create({
        data: {
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          activo: activo !== undefined ? activo : true,
        },
      });

      return res.status(201).json({ productType });
    } catch (error: any) {
      console.error('Error creating product type:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Ya existe un tipo de producto con este nombre' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
