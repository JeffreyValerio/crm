import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { sendInvitationEmail } from '@/lib/mail';
import { randomBytes } from 'crypto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession(req, res);

  if (!session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email válido es requerido' });
  }

  try {
    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.password) {
      return res.status(400).json({ error: 'Este usuario ya tiene una cuenta activa' });
    }

    // Generar token de invitación único
    const inviteToken = randomBytes(32).toString('hex');

    // Crear o actualizar usuario con token de invitación
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        inviteToken,
        invitedAt: new Date(),
        invitedBy: session.email || undefined,
      },
      create: {
        email,
        inviteToken,
        invitedAt: new Date(),
        invitedBy: session.email || undefined,
        role: 'user',
      },
    });

    // Enviar correo de invitación
    try {
      await sendInvitationEmail(email, inviteToken, session.email || undefined);
    } catch (emailError) {
      console.error('Error enviando email:', emailError);
      // No fallar la solicitud si el email falla, pero registrar el error
    }

    return res.status(200).json({
      success: true,
      message: 'Invitación enviada correctamente',
      user: {
        id: user.id,
        email: user.email,
        invitedAt: user.invitedAt,
      },
    });
  } catch (error) {
    console.error('Error creando invitación:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
