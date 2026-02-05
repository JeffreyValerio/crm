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
      const { periodo, estado, userId: queryUserId } = req.query;

      const where: any = {};

      // Si no es admin, solo puede ver sus propias nóminas pagadas
      if (session.role !== 'admin') {
        where.userId = session.userId;
        where.estado = 'PAGADO'; // Los vendedores solo ven nóminas pagadas
      } else {
        // Admin puede filtrar por usuario si se especifica
        if (queryUserId) {
          where.userId = queryUserId as string;
        }
        
        // Filtro por estado (solo para admin)
        if (estado) {
          where.estado = estado as string;
        }
      }

      // Filtro por período (formato: YYYY-MM)
      if (periodo) {
        where.periodo = periodo as string;
      }

      const payrolls = await prisma.payroll.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nombre: true,
              apellidos: true,
              role: true,
            },
          },
          aprobador: {
            select: {
              id: true,
              email: true,
              nombre: true,
              apellidos: true,
            },
          },
        },
        orderBy: [
          { periodo: 'desc' },
          { quincena: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return res.status(200).json({ payrolls });
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    // Solo admin puede generar nóminas
    if (session.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      const { periodo, userIds, quincena } = req.body;

      if (!periodo) {
        return res.status(400).json({ error: 'El período es requerido (formato: YYYY-MM)' });
      }

      // Validar formato de período (YYYY-MM)
      const periodoRegex = /^\d{4}-\d{2}$/;
      if (!periodoRegex.test(periodo)) {
        return res.status(400).json({ error: 'Formato de período inválido. Use YYYY-MM' });
      }

      // Validar quincena
      if (!quincena || (quincena !== 1 && quincena !== 2)) {
        return res.status(400).json({ error: 'La quincena es requerida y debe ser 1 o 2' });
      }

      // Validar que se hayan seleccionado vendedores
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'Debe seleccionar al menos un vendedor' });
      }

      // Obtener los vendedores seleccionados
      const vendedores = await prisma.user.findMany({
        where: {
          id: {
            in: userIds,
          },
          role: 'user',
        },
        select: {
          id: true,
          email: true,
          nombre: true,
          apellidos: true,
        },
      });

      if (vendedores.length === 0) {
        return res.status(400).json({ error: 'No se encontraron vendedores válidos' });
      }

      const salarioQuincenal = 200000; // Salario por quincena en colones

      const nóminasCreadas = [];

      // Generar nóminas para cada vendedor seleccionado (solo la quincena especificada)
      for (const vendedor of vendedores) {
        // El salario quincenal es fijo: 200,000 colones
        const total = salarioQuincenal; // Siempre 200,000, sin descuentos
        
        // Verificar si ya existe una nómina para este período y quincena
        const existe = await prisma.payroll.findUnique({
          where: {
            userId_periodo_quincena: {
              userId: vendedor.id,
              periodo: periodo,
              quincena: quincena,
            },
          },
        });

        // Si ya existe, omitirla
        if (existe) {
          continue;
        }

        // Crear la nómina
        const nómina = await prisma.payroll.create({
          data: {
            userId: vendedor.id,
            periodo: periodo,
            quincena: quincena,
            diasEsperados: 0, // No relevante
            diasTrabajados: 0, // No relevante
            salarioBase: salarioQuincenal, // 200,000 colones fijo
            montoDiario: 0, // No se usa
            total: total, // Siempre 200,000
            estado: 'PENDIENTE',
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                nombre: true,
                apellidos: true,
                role: true,
              },
            },
          },
        });

        nóminasCreadas.push(nómina);
      }

      if (nóminasCreadas.length === 0) {
        return res.status(200).json({
          message: `No se crearon nuevas nóminas. Todas ya existen para el período ${periodo}, quincena ${quincena}.`,
          payrolls: [],
          count: 0,
        });
      }

      return res.status(201).json({
        message: `Se crearon ${nóminasCreadas.length} nómina(s) para el período ${periodo}, quincena ${quincena}`,
        payrolls: nóminasCreadas,
        count: nóminasCreadas.length,
      });
    } catch (error: any) {
      console.error('Error creating payrolls:', error);
      
      // Error de duplicado (aunque ya lo manejamos, por si acaso)
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Ya existe una nómina para este período y quincena' });
      }

      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
