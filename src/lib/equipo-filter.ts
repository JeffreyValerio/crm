import { prisma } from './prisma';

/** Resuelve un equipoId a { in: [userId, ...] } para usar en filtros Prisma.
 *  Retorna null si el equipo no tiene miembros (no filtrar nada). */
export async function resolveEquipoUserIds(equipoId: string): Promise<string[] | null> {
  const miembros = await prisma.equipoMiembro.findMany({
    where: { equipoId },
    select: { userId: true },
  });
  return miembros.length > 0 ? miembros.map(m => m.userId) : null;
}
