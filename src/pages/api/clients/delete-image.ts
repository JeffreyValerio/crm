import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import cloudinary from '@/lib/cloudinary';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession(req, res);

  if (!session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({ error: 'public_id is required' });
    }

    // Extraer el public_id de la URL si se proporciona una URL completa
    let imagePublicId = public_id;
    if (public_id.includes('/')) {
      // Si es una URL, extraer el public_id
      const urlParts = public_id.split('/');
      const filename = urlParts[urlParts.length - 1];
      const folder = urlParts.slice(-2, -1)[0]; // Obtener la carpeta (ej: 'clients')
      imagePublicId = `${folder}/${filename.split('.')[0]}`;
    }

    // Eliminar imagen de Cloudinary
    const result = await cloudinary.uploader.destroy(imagePublicId);

    if (result.result === 'ok' || result.result === 'not found') {
      return res.status(200).json({ success: true, message: 'Imagen eliminada correctamente' });
    } else {
      return res.status(400).json({ error: 'Error al eliminar la imagen' });
    }
  } catch (error: any) {
    console.error('Error deleting image:', error);
    return res.status(500).json({ error: error.message || 'Error al eliminar la imagen' });
  }
}
