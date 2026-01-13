import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar si existe algún usuario en la base de datos
    const userCount = await prisma.user.count();
    
    return res.status(200).json({ 
      needsSetup: userCount === 0 
    });
  } catch (error) {
    console.error('Error checking setup:', error);
    return res.status(500).json({ error: 'Error al verificar el estado del sistema' });
  }
}
