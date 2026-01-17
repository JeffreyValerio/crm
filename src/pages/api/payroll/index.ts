import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { aplicarDescuentosANomina } from '@/lib/advance-calculations';
import { obtenerDesgloseAdelantos } from '@/lib/advance-details';

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

      // Si no es admin, solo puede ver sus propias nóminas
      if (session.role !== 'admin') {
        where.userId = session.userId;
      } else {
        // Admin puede filtrar por usuario si se especifica
        if (queryUserId) {
          where.userId = queryUserId as string;
        }
      }

      // Filtro por período (formato: YYYY-MM)
      if (periodo) {
        where.periodo = periodo as string;
      }

      // Filtro por estado
      if (estado) {
        where.estado = estado as string;
      }

      const payrolls = await prisma.payroll.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          aprobador: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: [
          { periodo: 'desc' },
          { quincena: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      // Agregar desglose de adelantos para cada nómina
      const payrollsConAdelantos = await Promise.all(
        payrolls.map(async (payroll) => {
          const adelantosDesglose = await obtenerDesgloseAdelantos(
            payroll.userId,
            payroll.periodo,
            payroll.quincena
          );
          return {
            ...payroll,
            adelantosDesglose,
          };
        })
      );

      return res.status(200).json({ payrolls: payrollsConAdelantos });
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
      const { periodo } = req.body;

      if (!periodo) {
        return res.status(400).json({ error: 'El período es requerido (formato: YYYY-MM)' });
      }

      // Validar formato de período (YYYY-MM)
      const periodoRegex = /^\d{4}-\d{2}$/;
      if (!periodoRegex.test(periodo)) {
        return res.status(400).json({ error: 'Formato de período inválido. Use YYYY-MM' });
      }

      // Obtener todos los vendedores (usuarios con role='user')
      const vendedores = await prisma.user.findMany({
        where: {
          role: 'user',
        },
        select: {
          id: true,
          email: true,
        },
      });

      if (vendedores.length === 0) {
        return res.status(400).json({ error: 'No hay vendedores registrados' });
      }

      // Calcular días laborables (lunes a viernes) por quincena
      function calcularDiasLaborablesQuincena(periodo: string, quincena: number): number {
        const [año, mes] = periodo.split('-').map(Number);
        
        // Determinar el rango de días de la quincena
        const diasEnMes = new Date(año, mes, 0).getDate(); // Días totales del mes
        const inicioQuincena = quincena === 1 ? 1 : 16;
        const finQuincena = quincena === 1 ? 15 : diasEnMes;
        
        let diasLaborables = 0;
        
        // Contar días laborables (lunes=1 a viernes=5)
        for (let dia = inicioQuincena; dia <= finQuincena; dia++) {
          const fecha = new Date(año, mes - 1, dia); // mes - 1 porque Date usa 0-indexed
          const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
          
          // Si es lunes a viernes (1-5)
          if (diaSemana >= 1 && diaSemana <= 5) {
            diasLaborables++;
          }
        }
        
        return diasLaborables;
      }

      const salarioMensual = 400000; // Salario mensual en colones
      const salarioQuincenal = 200000; // Salario por quincena en colones

      const nóminasCreadas = [];

      // Generar nóminas para cada vendedor (2 quincenas)
      for (const vendedor of vendedores) {
        for (let quincena = 1; quincena <= 2; quincena++) {
          // Calcular días laborables esperados para esta quincena
          const diasEsperados = calcularDiasLaborablesQuincena(periodo, quincena);
          
          // Por defecto, los días trabajados son iguales a los esperados
          // pero el admin puede modificarlos después
          const diasTrabajados = diasEsperados;
          
          // El salario quincenal es fijo: 200,000 colones
          // El salario diario se calcula dividiendo el salario quincenal entre los días esperados
          const montoDiario = Math.round(salarioQuincenal / diasEsperados);
          
          // El total se calcula proporcionalmente: salarioQuincenal * (diasTrabajados / diasEsperados)
          // Por defecto será 200,000, pero si el admin modifica los días trabajados, cambiará
          const totalBase = Math.round(salarioQuincenal * (diasTrabajados / diasEsperados));
          
          // Aplicar descuentos de adelantos
          const total = await aplicarDescuentosANomina(
            vendedor.id,
            periodo,
            quincena,
            totalBase
          );
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
              diasEsperados: diasEsperados,
              diasTrabajados: diasTrabajados,
              salarioBase: salarioQuincenal, // Mantener 200,000 como salario base por quincena
              montoDiario: montoDiario,
              total: total, // Calculado proporcionalmente
              estado: 'PENDIENTE',
            },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  role: true,
                },
              },
            },
          });

          nóminasCreadas.push(nómina);
        }
      }

      if (nóminasCreadas.length === 0) {
        return res.status(200).json({
          message: 'No se crearon nuevas nóminas. Todas ya existen para este período.',
          payrolls: [],
          count: 0,
        });
      }

      return res.status(201).json({
        message: `Se crearon ${nóminasCreadas.length} nómina(s) para el período ${periodo}`,
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
