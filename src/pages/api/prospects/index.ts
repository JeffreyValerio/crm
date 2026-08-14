import { isSuperAdmin } from '@/lib/roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { hasPermiso } from '@/lib/permisos';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  if (req.method === 'GET') {
    try {
      if (!(await hasPermiso(session.role, 'prospectos', 'ver'))) {
        return res.status(403).json({ error: 'Sin permiso para ver prospectos' });
      }

      const { search, asignadoA, metodoContacto, tipo, mostrarContactados, page = '1', limit = '15' } = req.query;

      const where: any = {};

      // ── Control de acceso por rol ────────────────────────────────────────────
      if (isSuperAdmin(session.role)) {
        // Ve todo; filtro opcional por agente
        if (asignadoA) {
          where.asignadoA = asignadoA === 'sin_asignar' ? null : asignadoA as string;
        }
      } else if (session.role === 'admin') {
        // Solo prospectos asignados a usuarios de su empresa
        const me = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { empresaId: true },
        });
        const empresaUsers = me?.empresaId
          ? await prisma.user.findMany({
              where: { empresaId: me.empresaId },
              select: { id: true },
            })
          : [];
        const ids = empresaUsers.map(u => u.id);
        where.asignadoA = asignadoA
          ? ids.includes(asignadoA as string) ? asignadoA as string : '__none__'
          : { in: ids };
      } else if (session.role === 'teamlead') {
        // Solo prospectos asignados a miembros de su equipo
        const miEquipo = await prisma.equipo.findFirst({
          where: { teamLeadId: session.userId },
          include: { miembros: { select: { userId: true } } },
        });
        const ids = miEquipo ? miEquipo.miembros.map(m => m.userId) : [];
        where.asignadoA = asignadoA
          ? ids.includes(asignadoA as string) ? asignadoA as string : '__none__'
          : { in: ids };
      } else {
        // Vendedor / teamlead — solo los suyos
        where.asignadoA = session.userId;
        // Por defecto: solo los no contactados. Con mostrarContactados=true: solo los contactados.
        if (mostrarContactados === 'true') {
          where.totalContactos = { gt: 0 };
        } else {
          where.totalContactos = 0;
        }
      }

      // ── Filtro por tipo (tab) ────────────────────────────────────────────────
      if (tipo && typeof tipo === 'string' && tipo !== 'META') {
        where.tipo = tipo;
      } else if (tipo === 'META') {
        where.tipo = 'META';
      }

      // ── Filtro por tipificación ──────────────────────────────────────────────
      if (metodoContacto && typeof metodoContacto === 'string') {
        where.metodoContacto = metodoContacto;
      }

      // ── Búsqueda por texto ───────────────────────────────────────────────────
      if (search && typeof search === 'string' && search.trim()) {
        const s = search.trim();
        const searchConds = [
          { cliente: { contains: s, mode: 'insensitive' } },
          { nroOrden: { contains: s, mode: 'insensitive' } },
          { idCliente: { contains: s, mode: 'insensitive' } },
          { telCelular: { contains: s, mode: 'insensitive' } },
          { telOficina: { contains: s, mode: 'insensitive' } },
          { despacho: { contains: s, mode: 'insensitive' } },
        ];
        where.AND = [{ ...where }, { OR: searchConds }];
        const keys = Object.keys(where).filter(k => k !== 'AND');
        keys.forEach(k => delete where[k]);
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const [total, prospectos] = await Promise.all([
        prisma.prospecto.count({ where }),
        prisma.prospecto.findMany({
          where,
          include: {
            asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
          },
          orderBy: [
            { asignadoA: { sort: 'asc', nulls: 'first' } },
            { asignadoAt: { sort: 'desc', nulls: 'last' } },
          ],
          skip,
          take: limitNum,
        }),
      ]);

      // ── puedesSolicitar (vendedores y teamleads) ─────────────────────────────
      let puedesSolicitar: boolean | undefined;
      if (session.role === 'user' || session.role === 'teamlead') {
        const tipoFiltro = (tipo as string) || 'GPON';
        const sinContactar = await prisma.prospecto.count({
          where: { asignadoA: session.userId, totalContactos: 0, tipo: tipoFiltro },
        });
        puedesSolicitar = sinContactar === 0;
      }

      return res.status(200).json({
        prospectos,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
        ...(puedesSolicitar !== undefined ? { puedesSolicitar } : {}),
      });
    } catch (error) {
      console.error('Error fetching prospectos:', error);
      return res.status(500).json({ error: 'Error interno del servidor', detail: String(error) });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
