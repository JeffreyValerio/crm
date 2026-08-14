import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { isAdmin, isSuperAdmin } from '@/lib/roles';

const DEFAULTS = { metaGpon: 5, metaPostpago: 15, metaPortabilidad: 10 };

function toMeta(mv: { metaGpon: number; metaPostpago: number; metaPortabilidad: number } | null) {
  return mv ?? DEFAULTS;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (!isAdmin(session.role)) return res.status(403).json({ error: 'Sin permiso' });

  const isSuper = isSuperAdmin(session.role);

  // GET — devuelve metas de empresa(s)
  if (req.method === 'GET') {
    if (isSuper) {
      const empresas = await prisma.empresa.findMany({
        include: { metaVenta: true },
        orderBy: { nombre: 'asc' },
      });
      return res.json({
        empresas: empresas.map(e => ({
          id: e.id,
          nombre: e.nombre,
          meta: toMeta(e.metaVenta),
        })),
      });
    }

    // Admin — solo su empresa
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { empresa: { include: { metaVenta: true } } },
    });
    if (!user?.empresa) return res.json({ empresa: null });
    return res.json({
      empresa: {
        id: user.empresa.id,
        nombre: user.empresa.nombre,
        meta: toMeta(user.empresa.metaVenta),
      },
    });
  }

  // PUT — upsert metas de una empresa
  if (req.method === 'PUT') {
    const { empresaId, metaGpon, metaPostpago, metaPortabilidad } = req.body as {
      empresaId: string;
      metaGpon: number;
      metaPostpago: number;
      metaPortabilidad: number;
    };

    if (!empresaId) return res.status(400).json({ error: 'empresaId requerido' });

    if (!isSuper) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { empresaId: true },
      });
      if (user?.empresaId !== empresaId) {
        return res.status(403).json({ error: 'Sin permiso para esta empresa' });
      }
    }

    const meta = await prisma.empresaMetaVenta.upsert({
      where: { empresaId },
      create: {
        empresaId,
        metaGpon: metaGpon ?? DEFAULTS.metaGpon,
        metaPostpago: metaPostpago ?? DEFAULTS.metaPostpago,
        metaPortabilidad: metaPortabilidad ?? DEFAULTS.metaPortabilidad,
      },
      update: {
        metaGpon: metaGpon ?? DEFAULTS.metaGpon,
        metaPostpago: metaPostpago ?? DEFAULTS.metaPostpago,
        metaPortabilidad: metaPortabilidad ?? DEFAULTS.metaPortabilidad,
      },
    });

    return res.json({ meta });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
