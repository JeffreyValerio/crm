import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import bcrypt from 'bcryptjs';

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
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          email: true,
          nombre: true,
          apellidos: true,
          role: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ user });
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { nombre, apellidos, password, currentPassword } = req.body;

      // Obtener el usuario actual para verificar la contraseña si se está cambiando
      const currentUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { password: true },
      });

      if (!currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updateData: any = {};

      // Actualizar nombre y apellidos si se proporcionan
      if (nombre !== undefined) {
        updateData.nombre = nombre?.trim() || null;
      }
      if (apellidos !== undefined) {
        updateData.apellidos = apellidos?.trim() || null;
      }

      // Si se está cambiando la contraseña, verificar la contraseña actual
      if (password) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required to change password' });
        }

        // Verificar que el usuario tenga una contraseña establecida
        if (!currentUser.password) {
          return res.status(400).json({ error: 'User does not have a password set' });
        }

        // Verificar la contraseña actual
        const isValidPassword = await bcrypt.compare(currentPassword, currentUser.password);
        if (!isValidPassword) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Validar nueva contraseña
        if (password.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Hashear la nueva contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.password = hashedPassword;
      }

      const user = await prisma.user.update({
        where: { id: session.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          nombre: true,
          apellidos: true,
          role: true,
        },
      });

      return res.status(200).json({ user });
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
