import { prisma } from './prisma';

/** Resuelve un equipoId a los userId de sus miembros + team lead.
 *  Retorna null si el equipo no tiene nadie (sin miembros y sin team lead). */
export async function resolveEquipoUserIds(equipoId: string): Promise<string[] | null> {
  const equipo = await prisma.equipo.findUnique({
    where: { id: equipoId },
    include: { miembros: { select: { userId: true } } },
  });
  if (!equipo) return null;

  const ids = new Set(equipo.miembros.map(m => m.userId));
  if (equipo.teamLeadId) ids.add(equipo.teamLeadId);

  return ids.size > 0 ? Array.from(ids) : null;
}
