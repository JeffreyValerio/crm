import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import cloudinary from '@/lib/cloudinary';
import { sendStatusNotificationEmail } from '@/lib/mail';

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
              nombre: true,
              apellidos: true,
            },
          },
          statusComments: {
            include: {
              creator: {
                select: {
                  id: true,
                  email: true,
                  nombre: true,
                  apellidos: true,
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
        fechaNacimiento,
        stb,
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
        simUrl,
        simCedulaUrl,
        validationStatus,
        validationComment,
        saleStatus,
        saleComment,
        formulario,
        postpagoStatus,
        tipoPlanPostpago,
      } = req.body;

      // Obtener el cliente actual para comparar estados
      const currentClient = await prisma.client.findUnique({
        where: { id: id as string },
        include: { creator: { select: { email: true, nombre: true, apellidos: true } } },
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
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        stb: stb !== undefined && stb !== null && stb !== '' ? (typeof stb === 'string' ? parseInt(stb) : stb) : null,
        email: email?.trim() || null,
        telefono: telefono?.trim() || null,
        provincia: provincia?.trim(),
        canton: canton?.trim(),
        distrito: distrito?.trim(),
        senasExactas: senasExactas?.trim(),
        coordenadasLat: coordenadasLat?.trim().replace(/,\s*$/, '') || null,
        coordenadasLng: coordenadasLng?.trim().replace(/,\s*$/, '') || null,
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
      if (simUrl !== undefined) {
        if (currentClient.simUrl && currentClient.simUrl !== simUrl) {
          await deleteCloudinaryImage(currentClient.simUrl);
        }
        updateData.simUrl = simUrl || null;
      }
      if (simCedulaUrl !== undefined) {
        if (currentClient.simCedulaUrl && currentClient.simCedulaUrl !== simCedulaUrl) {
          await deleteCloudinaryImage(currentClient.simCedulaUrl);
        }
        updateData.simCedulaUrl = simCedulaUrl || null;
      }

      // Labels para notificaciones
      const validationLabels: Record<string, string> = {
        EN_PROCESO_VALIDACION: 'En proceso de validación',
        APROBADA: 'Aprobada ✅',
        REQUIERE_DEPOSITO: 'Requiere depósito ⚠️',
        NO_APLICA: 'No aplica',
        INCOBRABLE: 'Incobrable ❌',
        DEUDA_MENOR_ANIO: 'Deuda menor a un año ⚠️',
      };
      const saleLabels: Record<string, string> = {
        PENDIENTE_INSTALACION: 'Pendiente de instalación 📋',
        INSTALADA: 'Instalada ✅',
        CANCELADA: 'Cancelada ❌',
        NO_COMPLETO_FACEID: 'No completó FaceID ⚠️',
        CANCELADO_POR_COBERTURA: 'Cancelado por cobertura ❌',
        CLIENTE_NO_PERMITE_INSTALACION: 'Cliente no permite instalación ❌',
      };
      const nombreCliente = `${currentClient.nombres} ${currentClient.apellidos}`;

      // Manejar cambio de estado de validación - Solo para admin
      if (session.role === 'admin') {
        if (validationStatus && validationStatus !== currentClient.validationStatus) {
          updateData.validationStatus = validationStatus;
          updateData.validationComment = validationComment?.trim() || null;

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

          // Notificar al vendedor si no es el mismo admin
          if (currentClient.createdBy !== session.userId) {
            const mensaje = `Tu cliente ${nombreCliente} fue marcado como: ${validationLabels[validationStatus] ?? validationStatus}`;
            await prisma.notification.create({
              data: {
                userId: currentClient.createdBy,
                tipo: 'VALIDACION',
                titulo: 'Estado de validación actualizado',
                mensaje,
                clientId: id as string,
              },
            });
            sendStatusNotificationEmail({
              to: currentClient.creator.email,
              vendedor: currentClient.creator.nombre ?? currentClient.creator.email,
              clienteNombre: nombreCliente,
              tipo: 'Validación',
              nuevoEstado: validationLabels[validationStatus] ?? validationStatus,
            }).catch(e => console.error('[mail] error notificación validación:', e));
          }
        } else if (validationComment !== undefined) {
          updateData.validationComment = validationComment.trim();
        }

        // Manejar cambio de estado de venta - Solo para admin
        if (saleStatus !== undefined && saleStatus !== (currentClient.saleStatus ?? '')) {
          updateData.saleStatus = saleStatus || null;
          updateData.saleComment = saleComment?.trim() || null;

          if (saleStatus === 'INSTALADA') {
            updateData.instaladaAt = new Date();
          } else if (currentClient.saleStatus === 'INSTALADA') {
            updateData.instaladaAt = null;
          }

          if (saleStatus) {
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

            // Notificar al vendedor si no es el mismo admin
            if (currentClient.createdBy !== session.userId) {
              const mensajeVenta = `Tu cliente ${nombreCliente} fue marcado como: ${saleLabels[saleStatus] ?? saleStatus}`;
              await prisma.notification.create({
                data: {
                  userId: currentClient.createdBy,
                  tipo: 'VENTA',
                  titulo: 'Estado de venta actualizado',
                  mensaje: mensajeVenta,
                  clientId: id as string,
                },
              });
              sendStatusNotificationEmail({
                to: currentClient.creator.email,
                vendedor: currentClient.creator.nombre ?? currentClient.creator.email,
                clienteNombre: nombreCliente,
                tipo: 'Venta',
                nuevoEstado: saleLabels[saleStatus] ?? saleStatus,
              }).catch(e => console.error('[mail] error notificación venta:', e));
            }
          }
        } else if (saleComment !== undefined) {
          updateData.saleComment = saleComment.trim();
        }

        // Actualizar formulario si se proporciona
        if (formulario !== undefined) {
          updateData.formulario = formulario?.trim() || null;
        }

        // Estado postpago
        if (postpagoStatus !== undefined && currentClient.tipo === 'POSTPAGO') {
          updateData.postpagoStatus = postpagoStatus || null;
        }
        if (tipoPlanPostpago !== undefined && currentClient.tipo === 'POSTPAGO') {
          updateData.tipoPlanPostpago = tipoPlanPostpago || null;
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
              nombre: true,
              apellidos: true,
            },
          },
          statusComments: {
            include: {
              creator: {
                select: {
                  id: true,
                  email: true,
                  nombre: true,
                  apellidos: true,
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

  if (req.method === 'PATCH') {
    try {
      if (session.role !== 'admin') {
        return res.status(403).json({ error: 'No tienes permiso para reasignar este cliente' });
      }

      const { createdBy } = req.body;

      if (!createdBy || typeof createdBy !== 'string') {
        return res.status(400).json({ error: 'El campo createdBy es requerido y debe ser un string' });
      }

      const targetUser = await prisma.user.findUnique({ where: { id: createdBy } });
      if (!targetUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const existingClient = await prisma.client.findUnique({ where: { id: id as string } });
      if (!existingClient) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      const client = await prisma.client.update({
        where: { id: id as string },
        data: { createdBy, assignedAt: new Date() },
        include: {
          plan: { include: { productType: true } },
          creator: { select: { id: true, email: true, nombre: true, apellidos: true } },
          statusComments: {
            include: {
              creator: { select: { id: true, email: true, nombre: true, apellidos: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return res.status(200).json({ client });
    } catch (error) {
      console.error('Error reassigning client:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
