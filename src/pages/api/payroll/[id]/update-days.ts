import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { aplicarDescuentosANomina } from '@/lib/advance-calculations';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);

  if (!session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Solo admin puede actualizar días trabajados
  if (session.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { diasTrabajados } = req.body;

      if (typeof diasTrabajados !== 'number' || diasTrabajados < 0) {
        return res.status(400).json({ error: 'Los días trabajados deben ser un número mayor o igual a 0' });
      }

      // Verificar que la nómina existe
      const payroll = await prisma.payroll.findUnique({
        where: { id: id as string },
      });

      if (!payroll) {
        return res.status(404).json({ error: 'Nómina no encontrada' });
      }

      // No permitir modificar días si ya está pagada
      if (payroll.estado === 'PAGADO') {
        return res.status(400).json({ error: 'No se pueden modificar los días de una nómina ya pagada' });
      }

      // Convertir Decimal a número para cálculos
      const salarioBase = Number(payroll.salarioBase);
      const diasEsperados = payroll.diasEsperados || payroll.diasTrabajados; // Fallback por si no existe el campo

      // Recalcular el total proporcionalmente
      // total = salarioBase * (diasTrabajados / diasEsperados)
      const totalBase = Math.round(salarioBase * (diasTrabajados / diasEsperados));
      
      // Aplicar descuentos de adelantos
      const total = await aplicarDescuentosANomina(
        payroll.userId,
        payroll.periodo,
        payroll.quincena,
        totalBase
      );

      // Recalcular el salario diario basado en días esperados (para referencia del admin)
      const montoDiario = Math.round(salarioBase / diasEsperados);

      // Actualizar la nómina
      const updatedPayroll = await prisma.payroll.update({
        where: { id: id as string },
        data: {
          diasTrabajados: diasTrabajados,
          montoDiario: montoDiario,
          total: total,
        },
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
      });

      return res.status(200).json({
        message: 'Días trabajados actualizados correctamente',
        payroll: updatedPayroll,
      });
    } catch (error) {
      console.error('Error updating payroll days:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
