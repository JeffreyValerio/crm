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

      // Actualizar URLs de imágenes solo si se proporcionan
      if (cedulaFrontalUrl !== undefined) updateData.cedulaFrontalUrl = cedulaFrontalUrl || null;
      if (cedulaTraseraUrl !== undefined) updateData.cedulaTraseraUrl = cedulaTraseraUrl || null;
      if (selfieUrl !== undefined) updateData.selfieUrl = selfieUrl || null;

      // Manejar cambio de estado de validación
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
      } else if (validationComment) {
        updateData.validationComment = validationComment.trim();
      }

      // Manejar cambio de estado de venta
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
      } else if (saleComment) {
        updateData.saleComment = saleComment.trim();
      }

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
