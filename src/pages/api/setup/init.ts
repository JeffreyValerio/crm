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

  try {
    // Verificar si ya existe algún usuario
    const existingUsers = await prisma.user.findMany();
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        error: 'El sistema ya está inicializado. Ya existen usuarios en la base de datos.' 
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Crear el primer usuario admin
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        email: email.trim(),
        password: hashedPassword,
        role: 'admin',
      },
    });

    return res.status(201).json({ 
      success: true, 
      message: 'Usuario administrador creado exitosamente',
      user: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      }
    });
  } catch (error: any) {
    console.error('Error creating initial admin:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un usuario con este email' });
    }

    return res.status(500).json({ error: 'Error al crear el usuario administrador' });
  }
}
