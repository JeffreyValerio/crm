import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

const DEFAULT_META_POR_MES = 8;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'Not authenticated' });

  const { year, month, createdBy } = req.query;

  const y = year ? parseInt(year as string) : null;
  const m = month ? parseInt(month as string) : null;

  // Calcular meta desde DB (KpiMeta por periodo YYYY-MM) o usar default
  let meta = DEFAULT_META_POR_MES;
  if (y && m) {
    const periodo = `${y}-${String(m).padStart(2, '0')}`;
    const kpi = await prisma.kpiMeta.findUnique({ where: { periodo } });
    meta = kpi?.meta ?? DEFAULT_META_POR_MES;
  } else if (y) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const mesesDelPeriodo = y === currentYear ? currentMonth : 12;

    // Sumar metas configuradas para cada mes del período
    const periodos = Array.from({ length: mesesDelPeriodo }, (_, i) =>
      `${y}-${String(i + 1).padStart(2, '0')}`
    );
    const kpis = await prisma.kpiMeta.findMany({ where: { periodo: { in: periodos } } });
    const kpiMap = new Map(kpis.map(k => [k.periodo, k.meta]));
    meta = periodos.reduce((sum, p) => sum + (kpiMap.get(p) ?? DEFAULT_META_POR_MES), 0);
  }

  // Rango de fechas en UTC para evitar problemas de zona horaria
  let dateRange: { gte: Date; lt: Date } | null = null;
  if (y && m) {
    dateRange = { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
  } else if (y) {
    dateRange = { gte: new Date(Date.UTC(y, 0, 1)), lt: new Date(Date.UTC(y + 1, 0, 1)) };
  }

  // Filtro de creador según rol
  const creatorCondition =
    session.role !== 'admin'
      ? { createdBy: session.userId }
      : createdBy && typeof createdBy === 'string'
      ? { createdBy }
      : null;

  // Un cliente pertenece al período si:
  // - está INSTALADA y su instaladaAt está en el rango, O
  // - no está INSTALADA y su createdAt está en el rango
  const periodCondition = dateRange
    ? {
        OR: [
          { saleStatus: 'INSTALADA' as const, instaladaAt: dateRange },
          {
            OR: [{ saleStatus: { not: 'INSTALADA' as const } }, { saleStatus: null }],
            createdAt: dateRange,
          },
        ],
      }
    : null;

  const conditions = [creatorCondition, periodCondition].filter(Boolean) as object[];
  const where: object =
    conditions.length === 0 ? {} :
    conditions.length === 1 ? conditions[0] :
    { AND: conditions };

  try {
    // ── 1. Agrupado por estado efectivo ────────────────────────────────────────
    // Clientes con saleStatus → agrupar por saleStatus (tiene prioridad de display)
    // Clientes sin saleStatus → agrupar por validationStatus
    const [groupedBySale, groupedByValidation] = await Promise.all([
      prisma.client.groupBy({
        by: ['saleStatus'],
        where: { AND: [where as object, { saleStatus: { not: null } }] },
        _count: { id: true },
      }),
      prisma.client.groupBy({
        by: ['validationStatus'],
        where: { AND: [where as object, { saleStatus: null }] },
        _count: { id: true },
      }),
    ]);

    const statsParEstado = [
      ...groupedBySale.map(g => ({ validationStatus: null, saleStatus: g.saleStatus, count: g._count.id })),
      ...groupedByValidation.map(g => ({ validationStatus: g.validationStatus, saleStatus: null, count: g._count.id })),
    ].sort((a, b) => b.count - a.count);

    const totalClients = statsParEstado.reduce((sum, g) => sum + g.count, 0);
    const instalaciones = groupedBySale
      .filter(g => g.saleStatus === 'INSTALADA')
      .reduce((sum, g) => sum + g._count.id, 0);

    // ── 2. Cumplimiento por vendedor ───────────────────────────────────────────
    let cumplimiento: Array<{
      userId: string;
      email: string;
      nombre: string | null;
      apellidos: string | null;
      installed: number;
      pending: number;
      target: number;
      percentage: number;
    }> = [];

    // Periodos involucrados (para lookup de metas por usuario)
    const periodosInvolucrados: string[] = [];
    if (y && m) {
      periodosInvolucrados.push(`${y}-${String(m).padStart(2, '0')}`);
    } else if (y) {
      const now = new Date();
      const mesesDelPeriodo = y === now.getFullYear() ? now.getMonth() + 1 : 12;
      for (let i = 1; i <= mesesDelPeriodo; i++) {
        periodosInvolucrados.push(`${y}-${String(i).padStart(2, '0')}`);
      }
    }

    if (session.role === 'admin') {
      const complianceRaw = await prisma.client.groupBy({
        by: ['createdBy', 'saleStatus'],
        where,
        _count: { id: true },
      });

      const userIds = [...new Set(complianceRaw.map(r => r.createdBy))];
      const [users, userKpis, globalKpis] = await Promise.all([
        prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, nombre: true, apellidos: true },
        }),
        periodosInvolucrados.length > 0
          ? prisma.userKpiMeta.findMany({
              where: { userId: { in: userIds }, periodo: { in: periodosInvolucrados } },
            })
          : Promise.resolve([]),
        periodosInvolucrados.length > 0
          ? prisma.kpiMeta.findMany({ where: { periodo: { in: periodosInvolucrados } } })
          : Promise.resolve([]),
      ]);

      const userMap = new Map(users.map(u => [u.id, u]));
      const globalKpiMap = new Map(globalKpis.map(k => [k.periodo, k.meta]));

      // Calcular meta por usuario sumando sus metas de cada período
      function userTargetForPeriods(uid: string): number {
        return periodosInvolucrados.reduce((sum, p) => {
          const userSpecific = userKpis.find(k => k.userId === uid && k.periodo === p);
          return sum + (userSpecific?.meta ?? globalKpiMap.get(p) ?? DEFAULT_META_POR_MES);
        }, 0) || DEFAULT_META_POR_MES;
      }

      const compMap = new Map<string, { userId: string; email: string; nombre: string | null; apellidos: string | null; installed: number; pending: number }>();
      for (const row of complianceRaw) {
        const u = userMap.get(row.createdBy);
        if (!u) continue;
        if (!compMap.has(row.createdBy)) {
          compMap.set(row.createdBy, { userId: row.createdBy, email: u.email, nombre: u.nombre, apellidos: u.apellidos, installed: 0, pending: 0 });
        }
        const entry = compMap.get(row.createdBy)!;
        if (row.saleStatus === 'INSTALADA') entry.installed += row._count.id;
        else if (row.saleStatus === 'PENDIENTE_INSTALACION') entry.pending += row._count.id;
      }

      cumplimiento = Array.from(compMap.values()).map(s => {
        const target = userTargetForPeriods(s.userId);
        return {
          ...s,
          target,
          percentage: Math.round(Math.min((s.installed / target) * 100, 100)),
        };
      });
    } else {
      // Meta del propio usuario
      const myUserKpis = periodosInvolucrados.length > 0
        ? await prisma.userKpiMeta.findMany({
            where: { userId: session.userId, periodo: { in: periodosInvolucrados } },
          })
        : [];
      const globalKpis = periodosInvolucrados.length > 0
        ? await prisma.kpiMeta.findMany({ where: { periodo: { in: periodosInvolucrados } } })
        : [];
      const globalKpiMap = new Map(globalKpis.map(k => [k.periodo, k.meta]));
      const myTarget = periodosInvolucrados.reduce((sum, p) => {
        const userSpecific = myUserKpis.find(k => k.periodo === p);
        return sum + (userSpecific?.meta ?? globalKpiMap.get(p) ?? DEFAULT_META_POR_MES);
      }, 0) || DEFAULT_META_POR_MES;

      const myInstalled = groupedBySale.filter(g => g.saleStatus === 'INSTALADA').reduce((s, g) => s + g._count.id, 0);
      const myPending = groupedBySale.find(g => g.saleStatus === 'PENDIENTE_INSTALACION')?._count.id ?? 0;
      cumplimiento = [{
        userId: session.userId,
        email: session.email || '',
        nombre: null,
        apellidos: null,
        installed: myInstalled,
        pending: myPending,
        target: myTarget,
        percentage: Math.round(Math.min((myInstalled / myTarget) * 100, 100)),
      }];
    }

    return res.status(200).json({
      totalClients,
      instalaciones,
      meta,
      efectividad: totalClients > 0 ? Math.round((instalaciones / totalClients) * 10000) / 100 : 0,
      statsParEstado,
      cumplimiento,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
