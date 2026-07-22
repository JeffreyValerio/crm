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
      const { validationStatus, saleStatus, createdBy, search, year, month, page = '1', limit = '10' } = req.query;

      const conditions: object[] = [];

      // Filtro de rol y creador
      if (session.role === 'admin') {
        if (validationStatus) conditions.push({ validationStatus });
        if (saleStatus) conditions.push({ saleStatus });
        if (createdBy) conditions.push({ createdBy });
      } else {
        conditions.push({ createdBy: session.userId });
      }

      // Búsqueda por texto
      if (search && typeof search === 'string' && search.trim()) {
        const s = search.trim();
        conditions.push({
          OR: [
            { nombres: { contains: s, mode: 'insensitive' } },
            { apellidos: { contains: s, mode: 'insensitive' } },
            { numeroIdentificacion: { contains: s, mode: 'insensitive' } },
            { telefono: { contains: s, mode: 'insensitive' } },
            { email: { contains: s, mode: 'insensitive' } },
            { formulario: { contains: s, mode: 'insensitive' } },
          ],
        });
      }

      // Filtro de período: INSTALADA → instaladaAt, resto → createdAt
      const y = year ? parseInt(year as string) : null;
      const m = month ? parseInt(month as string) : null;
      if (y) {
        const dateRange = m
          ? { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) }
          : { gte: new Date(Date.UTC(y, 0, 1)), lt: new Date(Date.UTC(y + 1, 0, 1)) };
        conditions.push({
          OR: [
            { saleStatus: 'INSTALADA', instaladaAt: dateRange },
            {
              OR: [{ saleStatus: { not: 'INSTALADA' } }, { saleStatus: null }],
              createdAt: dateRange,
            },
          ],
        });
      }

      const where: any =
        conditions.length === 0 ? {} :
        conditions.length === 1 ? conditions[0] :
        { AND: conditions };

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
        orderBy: { updatedAt: 'desc' },
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
        tipo,
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
        postpagoStatus,
        tipoPlanPostpago,
      } = req.body;

      // Validaciones básicas
      if (!nombres || !apellidos || !tipoIdentificacion || !numeroIdentificacion) {
        return res.status(400).json({ error: 'Los campos nombres, apellidos, tipo de identificación y número de identificación son requeridos' });
      }

      if (!provincia || !canton || !distrito || !senasExactas) {
        return res.status(400).json({ error: 'La dirección completa es requerida' });
      }

      const isPostpago = tipo === 'POSTPAGO';
      const client = await prisma.client.create({
        data: {
          tipo: isPostpago ? 'POSTPAGO' : 'FIBRA',
          nombres: nombres.trim(),
          apellidos: apellidos.trim(),
          tipoIdentificacion,
          numeroIdentificacion: numeroIdentificacion.trim(),
          fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
          stb: !isPostpago && stb !== undefined && stb !== null && stb !== '' ? (typeof stb === 'string' ? parseInt(stb) : stb) : null,
          email: email?.trim() || null,
          telefono: telefono?.trim() || null,
          provincia: provincia.trim(),
          canton: canton.trim(),
          distrito: distrito.trim(),
          senasExactas: senasExactas.trim(),
          coordenadasLat: coordenadasLat?.trim().replace(/,\s*$/, '') || null,
          coordenadasLng: coordenadasLng?.trim().replace(/,\s*$/, '') || null,
          numeroMedidor: numeroMedidor?.trim() || null,
          planId: planId || null,
          cedulaFrontalUrl: cedulaFrontalUrl || null,
          cedulaTraseraUrl: cedulaTraseraUrl || null,
          selfieUrl: selfieUrl || null,
          simUrl: isPostpago ? (simUrl || null) : null,
          simCedulaUrl: isPostpago ? (simCedulaUrl || null) : null,
          createdBy: session.userId,
          validationStatus: !isPostpago ? 'EN_PROCESO_VALIDACION' : null,
          postpagoStatus: isPostpago ? (postpagoStatus || 'PENDIENTE_ACTIVACION') : null,
          tipoPlanPostpago: isPostpago ? (tipoPlanPostpago || null) : null,
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
