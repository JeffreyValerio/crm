import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token y contraseña son requeridos' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    // Buscar usuario por token
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
    });

    if (!user) {
      return res.status(404).json({ error: 'Token de invitación inválido' });
    }

    // Verificar si ya tiene contraseña
    if (user.password) {
      return res.status(400).json({ error: 'Esta cuenta ya fue activada' });
    }

    // Verificar si el token expiró
    if (user.invitedAt) {
      const daysSinceInvite = (Date.now() - user.invitedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceInvite > 7) {
        return res.status(400).json({ error: 'El token de invitación ha expirado' });
      }
    }

    // Hashear contraseña y actualizar usuario
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        inviteToken: null, // Limpiar el token después de activar
        invitedAt: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Cuenta activada correctamente',
    });
  } catch (error) {
    console.error('Error aceptando invitación:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
