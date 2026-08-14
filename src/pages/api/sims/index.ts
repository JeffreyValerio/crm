import { isAdmin, isSuperAdmin } from '@/lib/roles';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { hasPermiso } from '@/lib/permisos';

/** Devuelve el empresaId del usuario en sesión (null si superadmin o sin empresa) */
async function getEmpresaId(userId: string): Promise<string | null> {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { empresaId: true } });
  return me?.empresaId ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (!isAdmin(session.role)) return res.status(403).json({ error: 'Sin permiso' });

  if (req.method === 'GET') {
    if (!(await hasPermiso(session.role, 'inventario_sim', 'ver'))) {
      return res.status(403).json({ error: 'Sin permiso para ver el inventario de SIMs' });
    }
    const { provincia, estado } = req.query;
    const where: any = {};
    if (provincia && typeof provincia === 'string') where.provincia = provincia;
    if (estado && typeof estado === 'string') where.estado = estado;

    // Superadmin ve todos; admin solo ve SIMs de su empresa
    if (!isSuperAdmin(session.role)) {
      const empresaId = await getEmpresaId(session.userId);
      where.empresaId = empresaId ?? '__none__';
    }

    const sims = await prisma.simCard.findMany({ where, orderBy: { numero: 'asc' } });
    return res.status(200).json({ sims });
  }

  if (req.method === 'POST') {
    if (!(await hasPermiso(session.role, 'inventario_sim', 'agregar'))) {
      return res.status(403).json({ error: 'Sin permiso para agregar SIMs' });
    }

    const { numero, fotoUrl, fotoPublicId, provincia } = req.body;
    if (!numero?.trim()) return res.status(400).json({ error: 'El número de SIM es requerido' });

    const existing = await prisma.simCard.findUnique({ where: { numero: numero.trim() } });
    if (existing) return res.status(409).json({ error: 'Ya existe una SIM con ese número' });

    // Asociar la SIM a la empresa del admin que la agrega (superadmin queda sin empresa)
    const empresaId = isSuperAdmin(session.role) ? null : await getEmpresaId(session.userId);

    const sim = await prisma.simCard.create({
      data: {
        numero: numero.trim(),
        fotoUrl: fotoUrl || null,
        fotoPublicId: fotoPublicId || null,
        provincia: provincia?.trim() || null,
        empresaId: empresaId ?? null,
      },
    });
    return res.status(201).json({ sim });
  }

  return res.status(405).end();
}
