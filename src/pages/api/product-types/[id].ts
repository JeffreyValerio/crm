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

  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const productType = await prisma.productType.findUnique({
        where: { id: id as string },
        include: {
          products: true,
        },
      });

      if (!productType) {
        return res.status(404).json({ error: 'Tipo de producto no encontrado' });
      }

      return res.status(200).json({ productType });
    } catch (error) {
      console.error('Error fetching product type:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { nombre, descripcion, activo } = req.body;

      if (nombre !== undefined && nombre.trim() === '') {
        return res.status(400).json({ error: 'El nombre del tipo de producto no puede estar vacío' });
      }

      const updateData: any = {};
      if (nombre !== undefined) updateData.nombre = nombre.trim();
      if (descripcion !== undefined) updateData.descripcion = descripcion?.trim() || null;
      if (activo !== undefined) updateData.activo = activo;

      const productType = await prisma.productType.update({
        where: { id: id as string },
        data: updateData,
        include: {
          products: true,
        },
      });

      return res.status(200).json({ productType });
    } catch (error: any) {
      console.error('Error updating product type:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Ya existe un tipo de producto con este nombre' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Verificar si tiene productos asociados
      const productType = await prisma.productType.findUnique({
        where: { id: id as string },
        include: {
          products: true,
        },
      });

      if (productType && productType.products.length > 0) {
        return res.status(400).json({
          error: 'No se puede eliminar un tipo de producto que tiene productos asociados',
        });
      }

      await prisma.productType.delete({
        where: { id: id as string },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting product type:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
