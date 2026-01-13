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

  if (req.method === 'GET') {
    try {
      const { validationStatus, saleStatus } = req.query;

      const where: any = {};

      if (validationStatus) {
        where.validationStatus = validationStatus;
      }

      if (saleStatus) {
        where.saleStatus = saleStatus;
      }

      const clients = await prisma.client.findMany({
        where,
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
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json({ clients });
    } catch (error) {
      console.error('Error fetching clients:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
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
      } = req.body;

      // Validaciones básicas
      if (!nombres || !apellidos || !tipoIdentificacion || !numeroIdentificacion) {
        return res.status(400).json({ error: 'Los campos nombres, apellidos, tipo de identificación y número de identificación son requeridos' });
      }

      if (!provincia || !canton || !distrito || !senasExactas) {
        return res.status(400).json({ error: 'La dirección completa es requerida' });
      }

      const client = await prisma.client.create({
        data: {
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          tipoIdentificacion,
          numeroIdentificacion: numeroIdentificacion.trim(),
          email: email?.trim() || null,
          telefono: telefono?.trim() || null,
          provincia: provincia.trim(),
          canton: canton.trim(),
          distrito: distrito.trim(),
          senasExactas: senasExactas.trim(),
          coordenadasLat: coordenadasLat?.trim() || null,
          coordenadasLng: coordenadasLng?.trim() || null,
          numeroMedidor: numeroMedidor?.trim() || null,
          planId: planId || null,
          cedulaFrontalUrl: cedulaFrontalUrl || null,
          cedulaTraseraUrl: cedulaTraseraUrl || null,
          selfieUrl: selfieUrl || null,
          createdBy: session.userId,
          validationStatus: 'EN_PROCESO_VALIDACION',
        },
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
        },
      });

      return res.status(201).json({ client });
    } catch (error: any) {
      console.error('Error creating client:', error);
      
      // Error de duplicado
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Ya existe un cliente con este número de identificación o email' });
      }

      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
