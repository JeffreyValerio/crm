import { prisma } from './prisma';

export interface AdvanceDetail {
  id: string;
  monto: number;
  quincenas: number;
  montoRestante: number;
  montoPorQuincena: number;
  descuentoEnEstaQuincena: number;
  montoRestanteDespues: number;
}

/**
 * Obtiene el desglose de adelantos que se aplicarían a una nómina
 * sin actualizar los registros (solo para mostrar)
 */
export async function obtenerDesgloseAdelantos(
  userId: string,
  periodo: string,
  quincena: number
): Promise<AdvanceDetail[]> {
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
      aprobadoAt: 'asc', // Los más antiguos primero
    },
  });

  const desglose: AdvanceDetail[] = [];

  for (const adelanto of adelantos) {
    const montoNum = Number(adelanto.monto);
    const quincenasTotales = adelanto.quincenas;
    // Calcular monto por quincena sin redondeo (división exacta)
    const montoPorQuincena = montoNum / quincenasTotales;
    const montoRestanteNum = Number(adelanto.montoRestante);

    // Calcular cuánto se descontaría de este adelanto (mínimo entre monto por quincena y restante)
    const descuentoEnEstaQuincena = Math.min(montoPorQuincena, montoRestanteNum);

    if (descuentoEnEstaQuincena > 0) {
      desglose.push({
        id: adelanto.id,
        monto: montoNum,
        quincenas: quincenasTotales,
        montoRestante: montoRestanteNum,
        montoPorQuincena: montoPorQuincena,
        descuentoEnEstaQuincena: descuentoEnEstaQuincena,
        montoRestanteDespues: montoRestanteNum - descuentoEnEstaQuincena,
      });
    }
  }

  return desglose;
}
