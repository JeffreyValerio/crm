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
      const plan = await prisma.plan.findUnique({
        where: { id: id as string },
      });

      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      return res.status(200).json({ plan });
    } catch (error) {
      console.error('Error fetching plan:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { nombre, descripcion, activo, productTypeId } = req.body;

      // Si se envía nombre, validar que no esté vacío
      if (nombre !== undefined && nombre.trim() === '') {
        return res.status(400).json({ error: 'El nombre del producto no puede estar vacío' });
      }

      const updateData: any = {};
      if (nombre !== undefined) updateData.nombre = nombre.trim();
      if (descripcion !== undefined) updateData.descripcion = descripcion?.trim() || null;
      if (activo !== undefined) updateData.activo = activo;
      if (productTypeId !== undefined) updateData.productTypeId = productTypeId || null;

      const plan = await prisma.plan.update({
        where: { id: id as string },
        data: updateData,
        include: {
          productType: true,
        },
      });

      return res.status(200).json({ plan });
    } catch (error) {
      console.error('Error updating plan:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // No permitimos eliminar planes para mantener integridad
  if (req.method === 'DELETE') {
    return res.status(400).json({
      error: 'No se pueden eliminar planes. Puedes desactivarlos en su lugar.',
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
