import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import cloudinary from '@/lib/cloudinary';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);

  if (!session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const client = await prisma.client.findUnique({
        where: { id: id as string },
        include: {
          plan: {
            include: {
              productType: true,
            },
          },
          creator: {
            select: {
              id: true,
              email: true,
            },
          },
          statusComments: {
            include: {
              creator: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      // Usuarios no admin solo pueden ver sus propios clientes
      if (session.role !== 'admin' && client.createdBy !== session.userId) {
        return res.status(403).json({ error: 'No tienes permiso para ver este cliente' });
      }

      return res.status(200).json({ client });
    } catch (error) {
      console.error('Error fetching client:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const {
        nombres,
        apellidos,
        tipoIdentificacion,
        numeroIdentificacion,
        email,
        telefono,
        provincia,
        canton,
        distrito,
        senasExactas,
        coordenadasLat,
        coordenadasLng,
        numeroMedidor,
        planId,
        cedulaFrontalUrl,
        cedulaTraseraUrl,
        selfieUrl,
        validationStatus,
        validationComment,
        saleStatus,
        saleComment,
      } = req.body;

      // Obtener el cliente actual para comparar estados
      const currentClient = await prisma.client.findUnique({
        where: { id: id as string },
      });

      if (!currentClient) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      // Usuarios no admin solo pueden editar sus propios clientes
      if (session.role !== 'admin' && currentClient.createdBy !== session.userId) {
        return res.status(403).json({ error: 'No tienes permiso para editar este cliente' });
      }

      // Preparar datos para actualizar
      const updateData: any = {
        nombres: nombres?.trim(),
        apellidos: apellidos?.trim(),
        tipoIdentificacion,
        numeroIdentificacion: numeroIdentificacion?.trim(),
        email: email?.trim() || null,
        telefono: telefono?.trim() || null,
        provincia: provincia?.trim(),
        canton: canton?.trim(),
        distrito: distrito?.trim(),
        senasExactas: senasExactas?.trim(),
        coordenadasLat: coordenadasLat?.trim() || null,
        coordenadasLng: coordenadasLng?.trim() || null,
        numeroMedidor: numeroMedidor?.trim() || null,
        planId: planId || null,
      };

      // Función helper para eliminar imagen de Cloudinary
      const deleteCloudinaryImage = async (url: string | null) => {
        if (!url || !url.includes('cloudinary.com')) return;
        try {
          const urlParts = url.split('/');
          const uploadIndex = urlParts.findIndex(part => part === 'upload');
          if (uploadIndex === -1) return;
          
          const afterUpload = urlParts.slice(uploadIndex + 1);
          const versionIndex = afterUpload.findIndex(part => part.match(/^v\d+$/));
          
          if (versionIndex !== -1) {
            const publicIdParts = afterUpload.slice(versionIndex + 1);
            const publicId = publicIdParts.join('/').split('.')[0];
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (error) {
          console.error('Error al eliminar imagen de Cloudinary:', error);
        }
      };

      // Actualizar URLs de imágenes solo si se proporcionan y eliminar las antiguas
      if (cedulaFrontalUrl !== undefined) {
        if (currentClient.cedulaFrontalUrl && currentClient.cedulaFrontalUrl !== cedulaFrontalUrl) {
          await deleteCloudinaryImage(currentClient.cedulaFrontalUrl);
        }
        updateData.cedulaFrontalUrl = cedulaFrontalUrl || null;
      }
      if (cedulaTraseraUrl !== undefined) {
        if (currentClient.cedulaTraseraUrl && currentClient.cedulaTraseraUrl !== cedulaTraseraUrl) {
          await deleteCloudinaryImage(currentClient.cedulaTraseraUrl);
        }
        updateData.cedulaTraseraUrl = cedulaTraseraUrl || null;
      }
      if (selfieUrl !== undefined) {
        if (currentClient.selfieUrl && currentClient.selfieUrl !== selfieUrl) {
          await deleteCloudinaryImage(currentClient.selfieUrl);
        }
        updateData.selfieUrl = selfieUrl || null;
      }

      // Manejar cambio de estado de validación - Solo para admin
      if (session.role === 'admin') {
        if (validationStatus && validationStatus !== currentClient.validationStatus) {
          updateData.validationStatus = validationStatus;
          updateData.validationComment = validationComment?.trim() || null;

          // Crear comentario de estado
          await prisma.statusComment.create({
            data: {
              clientId: id as string,
              tipo: 'VALIDACION',
              estadoAnterior: currentClient.validationStatus || '',
              estadoNuevo: validationStatus,
              comentario: validationComment?.trim() || '',
              createdBy: session.userId,
            },
          });
        } else if (validationComment !== undefined) {
          updateData.validationComment = validationComment.trim();
        }

        // Manejar cambio de estado de venta - Solo para admin
        if (saleStatus && saleStatus !== currentClient.saleStatus) {
          updateData.saleStatus = saleStatus;
          updateData.saleComment = saleComment?.trim() || null;

          // Crear comentario de estado
          await prisma.statusComment.create({
            data: {
              clientId: id as string,
              tipo: 'VENTA',
              estadoAnterior: currentClient.saleStatus || '',
              estadoNuevo: saleStatus,
              comentario: saleComment?.trim() || '',
              createdBy: session.userId,
            },
          });
        } else if (saleComment !== undefined) {
          updateData.saleComment = saleComment.trim();
        }
      }
      // Si no es admin, ignoramos los cambios de estado y mantenemos los valores actuales

      const client = await prisma.client.update({
        where: { id: id as string },
        data: updateData,
        include: {
          plan: {
            include: {
              productType: true,
            },
          },
          creator: {
            select: {
              id: true,
              email: true,
            },
          },
          statusComments: {
            include: {
              creator: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      return res.status(200).json({ client });
    } catch (error: any) {
      console.error('Error updating client:', error);
      
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Ya existe un cliente con este número de identificación o email' });
      }

      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const client = await prisma.client.findUnique({
        where: { id: id as string },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      // Usuarios no admin solo pueden eliminar sus propios clientes
      if (session.role !== 'admin' && client.createdBy !== session.userId) {
        return res.status(403).json({ error: 'No tienes permiso para eliminar este cliente' });
      }

      // Función helper para eliminar imagen de Cloudinary
      const deleteCloudinaryImage = async (url: string | null) => {
        if (!url || !url.includes('cloudinary.com')) return;
        try {
          const urlParts = url.split('/');
          const uploadIndex = urlParts.findIndex(part => part === 'upload');
          if (uploadIndex === -1) return;
          
          const afterUpload = urlParts.slice(uploadIndex + 1);
          const versionIndex = afterUpload.findIndex(part => part.match(/^v\d+$/));
          
          if (versionIndex !== -1) {
            const publicIdParts = afterUpload.slice(versionIndex + 1);
            const publicId = publicIdParts.join('/').split('.')[0];
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (error) {
          console.error('Error al eliminar imagen de Cloudinary:', error);
        }
      };

      // Eliminar todas las imágenes de Cloudinary antes de eliminar el cliente
      await Promise.all([
        deleteCloudinaryImage(client.cedulaFrontalUrl),
        deleteCloudinaryImage(client.cedulaTraseraUrl),
        deleteCloudinaryImage(client.selfieUrl),
      ]);

      await prisma.client.delete({
        where: { id: id as string },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting client:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
