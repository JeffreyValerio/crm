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
      const { validationStatus, saleStatus, createdBy, search, page = '1', limit = '10' } = req.query;

      const where: any = {};

      // Construir filtros base
      const baseFilters: any = {};

      // Solo permitir filtros de estado y creador si el usuario es admin
      if (session.role === 'admin') {
        if (validationStatus) {
          baseFilters.validationStatus = validationStatus;
        }

        if (saleStatus) {
          baseFilters.saleStatus = saleStatus;
        }

        if (createdBy) {
          baseFilters.createdBy = createdBy;
        }
      } else {
        // Usuarios no admin solo ven sus propios clientes
        baseFilters.createdBy = session.userId;
      }

      // Búsqueda por texto (nombres, apellidos, número de identificación, teléfono, email)
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = search.trim();
        const searchConditions = [
          { nombres: { contains: searchTerm, mode: 'insensitive' } },
          { apellidos: { contains: searchTerm, mode: 'insensitive' } },
          { numeroIdentificacion: { contains: searchTerm, mode: 'insensitive' } },
          { telefono: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { formulario: { contains: searchTerm, mode: 'insensitive' } },
        ];
        
        // Si hay filtros base, combinar con AND
        if (Object.keys(baseFilters).length > 0) {
          where.AND = [
            baseFilters,
            { OR: searchConditions }
          ];
        } else {
          where.OR = searchConditions;
        }
      } else {
        // Si no hay búsqueda, usar solo los filtros base
        Object.assign(where, baseFilters);
      }

      // Paginación
      const pageNumber = parseInt(page as string, 10);
      const limitNumber = parseInt(limit as string, 10);
      const skip = (pageNumber - 1) * limitNumber;

      // Obtener total de registros
      const total = await prisma.client.count({ where });

      // Obtener clientes con paginación
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
              nombre: true,
              apellidos: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limitNumber,
      });

      return res.status(200).json({ 
        clients,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber),
        },
      });
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
          fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
          stb: stb !== undefined && stb !== null && stb !== '' ? (typeof stb === 'string' ? parseInt(stb) : stb) : null,
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
              nombre: true,
              apellidos: true,
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
