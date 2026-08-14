import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { isSuperAdmin } from '@/lib/roles';
import { PANTALLAS_CONFIG, ROLES_SISTEMA, DEFAULTS } from '@/lib/permisos-config';
import { invalidarCachePermisos } from '@/lib/permisos';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (!isSuperAdmin(session.role)) return res.status(403).json({ error: 'Solo superadmin' });

  if (req.method === 'GET') {
    const registros = await prisma.rolPermiso.findMany();

    // Inicializar con defaults y sobrescribir con datos de DB
    const permisos: Record<string, Record<string, string[]>> = {};
    for (const rol of ROLES_SISTEMA) {
      permisos[rol] = {};
      for (const pantalla of PANTALLAS_CONFIG) {
        permisos[rol][pantalla.id] = DEFAULTS[rol]?.[pantalla.id] ?? [];
      }
    }
    for (const r of registros) {
      if (!permisos[r.rol]) permisos[r.rol] = {};
      permisos[r.rol][r.pantalla] = r.acciones;
    }

    return res.status(200).json({ permisos });
  }

  if (req.method === 'PUT') {
    const { rol, pantalla, acciones } = req.body as {
      rol: string;
      pantalla: string;
      acciones: string[];
    };

    if (!rol || !pantalla || !Array.isArray(acciones)) {
      return res.status(400).json({ error: 'Faltan campos: rol, pantalla, acciones' });
    }
    if (!ROLES_SISTEMA.includes(rol as any)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    if (!PANTALLAS_CONFIG.find(p => p.id === pantalla)) {
      return res.status(400).json({ error: 'Pantalla inválida' });
    }

    await prisma.rolPermiso.upsert({
      where: { rol_pantalla: { rol, pantalla } },
      update: { acciones },
      create: { rol, pantalla, acciones },
    });

    // Invalidar cache para que el cambio sea inmediato
    invalidarCachePermisos();

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
