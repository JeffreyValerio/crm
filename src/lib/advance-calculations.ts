import { prisma } from './prisma';

/**
 * Calcula los descuentos de adelantos para un usuario en una quincena específica
 * Retorna el monto total a descontar
 */
export async function calcularDescuentosAdelantos(
  userId: string,
  periodo: string,
  quincena: number
): Promise<number> {
  // Buscar adelantos aprobados o en cobro que aún tienen monto restante
  const adelantos = await prisma.advance.findMany({
    where: {
      userId: userId,
      estado: {
        in: ['APROBADO', 'EN_COBRO'],
      },
      montoRestante: {
        gt: 0,
      },
    },
    orderBy: {
      aprobadoAt: 'asc', // Cobrar primero los más antiguos
    },
  });

  let descuentoTotal = 0;

  for (const adelanto of adelantos) {
    const montoNum = Number(adelanto.monto);
    const quincenasTotales = adelanto.quincenas;
    // Calcular monto por quincena sin redondeo (división exacta)
    const montoPorQuincena = montoNum / quincenasTotales;
    const montoRestanteNum = Number(adelanto.montoRestante);

    // Calcular cuánto falta por cobrar de este adelanto (mínimo entre monto por quincena y restante)
    const descuentoAplicar = Math.min(montoPorQuincena, montoRestanteNum);

    if (descuentoAplicar > 0) {
      descuentoTotal += descuentoAplicar;

      // Actualizar el estado y monto restante del adelanto
      const nuevoMontoRestante = montoRestanteNum - descuentoAplicar;
      const nuevoEstado = nuevoMontoRestante <= 0 ? 'COMPLETADO' : 'EN_COBRO';

      await prisma.advance.update({
        where: { id: adelanto.id },
        data: {
          montoRestante: nuevoMontoRestante,
          estado: nuevoEstado,
          completadoAt: nuevoEstado === 'COMPLETADO' ? new Date() : null,
        },
      });
    }
  }

  return descuentoTotal;
}

/**
 * Recalcula el total de una nómina aplicando descuentos de adelantos
 */
export async function aplicarDescuentosANomina(
  userId: string,
  periodo: string,
  quincena: number,
  totalBase: number
): Promise<number> {
  const descuentos = await calcularDescuentosAdelantos(userId, periodo, quincena);
  return Math.max(0, totalBase - descuentos); // El total nunca puede ser negativo
}
