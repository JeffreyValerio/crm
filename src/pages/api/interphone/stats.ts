import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'Not authenticated' });

  const isAdmin = session.role === 'admin';
  const { modo = 'dia', fecha, year, mes, vendorId } = req.query;

  // Non-admin: force to own user only
  const effectiveVendorId = isAdmin ? (vendorId as string | undefined) : session.userId;

  // Resolve extension filter for a single vendor
  let extensionFilter: string | undefined;
  if (effectiveVendorId) {
    const u = await prisma.user.findUnique({
      where: { id: effectiveVendorId },
      select: { extension: true },
    });
    if (!u?.extension) {
      return res.status(200).json({ rows: [], periodo: '', isAdmin });
    }
    extensionFilter = u.extension;
  }

  // Date range
  let startDate: Date;
  let endDate: Date;
  let periodoStr = '';

  if (modo === 'mes') {
    const y = parseInt((year as string) || String(new Date().getFullYear()), 10);
    const m = parseInt((mes as string) || String(new Date().getMonth() + 1), 10);
    startDate  = new Date(Date.UTC(y, m - 1, 1));
    endDate    = new Date(Date.UTC(y, m, 1));
    periodoStr = `${y}-${String(m).padStart(2, '0')}`;
  } else {
    const targetDate = fecha ? new Date(fecha as string) : new Date();
    startDate  = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));
    endDate    = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate() + 1));
    periodoStr = startDate.toISOString().slice(0, 10);
  }

  // Users with extensions
  const users = await prisma.user.findMany({
    where: extensionFilter
      ? { extension: extensionFilter }
      : { extension: { not: null } },
    select: { id: true, nombre: true, apellidos: true, email: true, extension: true },
    orderBy: { nombre: 'asc' },
  });

  const userIds = users.map(u => u.id);

  // ExtensionStats query
  let statsMap: Map<string, {
    respondido: number; perdidas: number; correoVoz: number;
    sinRespuesta: number; ocupado: number;
    llamadasEntrantes: number; duracionInboundSeg: number;
    llamadasSalientes: number; duracionSalidaSeg: number;
  }>;

  if (modo === 'mes') {
    const grouped = await prisma.extensionStats.groupBy({
      by: ['extension'],
      where: {
        fecha: { gte: startDate, lt: endDate },
        ...(extensionFilter ? { extension: extensionFilter } : {}),
      },
      _sum: {
        respondido: true, perdidas: true, correoVoz: true,
        sinRespuesta: true, ocupado: true,
        llamadasEntrantes: true, duracionInboundSeg: true,
        llamadasSalientes: true, duracionSalidaSeg: true,
      },
    });
    statsMap = new Map(grouped.map(s => [s.extension, {
      respondido:         s._sum.respondido         ?? 0,
      perdidas:           s._sum.perdidas           ?? 0,
      correoVoz:          s._sum.correoVoz          ?? 0,
      sinRespuesta:       s._sum.sinRespuesta       ?? 0,
      ocupado:            s._sum.ocupado            ?? 0,
      llamadasEntrantes:  s._sum.llamadasEntrantes  ?? 0,
      duracionInboundSeg: s._sum.duracionInboundSeg ?? 0,
      llamadasSalientes:  s._sum.llamadasSalientes  ?? 0,
      duracionSalidaSeg:  s._sum.duracionSalidaSeg  ?? 0,
    }]));
  } else {
    const rows = await prisma.extensionStats.findMany({
      where: {
        fecha: startDate,
        ...(extensionFilter ? { extension: extensionFilter } : {}),
      },
    });
    statsMap = new Map(rows.map(s => [s.extension, {
      respondido:         s.respondido,
      perdidas:           s.perdidas,
      correoVoz:          s.correoVoz,
      sinRespuesta:       s.sinRespuesta,
      ocupado:            s.ocupado,
      llamadasEntrantes:  s.llamadasEntrantes,
      duracionInboundSeg: s.duracionInboundSeg,
      llamadasSalientes:  s.llamadasSalientes,
      duracionSalidaSeg:  s.duracionSalidaSeg,
    }]));
  }

  // Prospectos tipificados como LLAMADA en el período, agrupado por vendedor
  const llamadasCrmRaw = userIds.length > 0
    ? await prisma.prospecto.groupBy({
        by: ['asignadoA'],
        where: {
          metodoContacto: 'LLAMADA',
          ultimoContacto: { gte: startDate, lt: endDate },
          asignadoA: { in: userIds },
        },
        _count: { id: true },
      })
    : [];

  const llamadasCrmMap = new Map<string, number>(
    llamadasCrmRaw
      .filter(r => r.asignadoA !== null)
      .map(r => [r.asignadoA as string, r._count.id])
  );

  const result = users.map(u => {
    const s = statsMap.get(u.extension!);
    return {
      userId:             u.id,
      nombre:             u.nombre && u.apellidos ? `${u.nombre} ${u.apellidos}` : u.email,
      extension:          u.extension,
      respondido:         s?.respondido         ?? 0,
      perdidas:           s?.perdidas           ?? 0,
      correoVoz:          s?.correoVoz          ?? 0,
      sinRespuesta:       s?.sinRespuesta       ?? 0,
      ocupado:            s?.ocupado            ?? 0,
      llamadasEntrantes:  s?.llamadasEntrantes  ?? 0,
      duracionInboundSeg: s?.duracionInboundSeg ?? 0,
      llamadasSalientes:  s?.llamadasSalientes  ?? 0,
      duracionSalidaSeg:  s?.duracionSalidaSeg  ?? 0,
      tipificadasLlamada: llamadasCrmMap.get(u.id) ?? 0,
      sinDatos:           !s,
    };
  });

  return res.status(200).json({ rows: result, periodo: periodoStr, isAdmin });
}
