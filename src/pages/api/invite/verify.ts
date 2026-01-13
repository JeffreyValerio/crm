import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token requerido' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        email: true,
        inviteToken: true,
        invitedAt: true,
        password: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Token de invitación inválido' });
    }

    // Verificar si ya tiene contraseña (ya activó la cuenta)
    if (user.password) {
      return res.status(400).json({ error: 'Esta cuenta ya fue activada' });
    }

    // Verificar si el token expiró (7 días)
    if (user.invitedAt) {
      const daysSinceInvite = (Date.now() - user.invitedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceInvite > 7) {
        return res.status(400).json({ error: 'El token de invitación ha expirado' });
      }
    }

    return res.status(200).json({
      email: user.email,
      invitedAt: user.invitedAt,
    });
  } catch (error) {
    console.error('Error verificando token:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
