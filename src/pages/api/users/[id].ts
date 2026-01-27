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

  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }

      // Validar nueva contraseña
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      // Hashear la nueva contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.update({
        where: { id: id as string },
        data: { password: hashedPassword },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updating user password:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // No permitir eliminar el propio usuario
      if (id === session.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      // Verificar si el usuario tiene registros asociados
      const [clientsCount, payrollsCount, advancesCount, statusCommentsCount] = await Promise.all([
        prisma.client.count({ where: { createdBy: id as string } }),
        prisma.payroll.count({ where: { userId: id as string } }),
        prisma.advance.count({ where: { userId: id as string } }),
        prisma.statusComment.count({ where: { createdBy: id as string } }),
      ]);

      if (clientsCount > 0 || payrollsCount > 0 || advancesCount > 0 || statusCommentsCount > 0) {
        const reasons = [];
        if (clientsCount > 0) reasons.push(`${clientsCount} cliente(s)`);
        if (payrollsCount > 0) reasons.push(`${payrollsCount} nómina(s)`);
        if (advancesCount > 0) reasons.push(`${advancesCount} adelanto(s)`);
        if (statusCommentsCount > 0) reasons.push(`${statusCommentsCount} comentario(s)`);
        
        return res.status(400).json({ 
          error: `No se puede eliminar el usuario porque tiene registros asociados: ${reasons.join(', ')}` 
        });
      }

      await prisma.user.delete({
        where: { id: id as string },
      });

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      
      // Manejar error de restricción de clave foránea
      if (error.code === 'P2003') {
        return res.status(400).json({ 
          error: 'No se puede eliminar el usuario porque tiene registros asociados en el sistema' 
        });
      }
      
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}