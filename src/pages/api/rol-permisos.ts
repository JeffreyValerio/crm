import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { isSuperAdmin } from '@/lib/roles';

// Pantallas del sistema y sus posibles acciones
export const PANTALLAS_CONFIG = [
  { id: 'dashboard',         label: 'Dashboard',          acciones: ['ver'] },
  { id: 'clientes_gpon',     label: 'Clientes GPON',      acciones: ['ver', 'crear', 'editar', 'eliminar'] },
  { id: 'clientes_postpago', label: 'Clientes Postpago',  acciones: ['ver', 'crear', 'editar'] },
  { id: 'prospectos',        label: 'Prospectos',         acciones: ['ver', 'solicitar', 'asignar', 'contactar'] },
  { id: 'interphone',        label: 'Interphone',         acciones: ['ver', 'llamar'] },
  { id: 'nomina',            label: 'Nómina',             acciones: ['ver', 'crear', 'aprobar', 'pagar', 'editar'] },
  { id: 'adelantos',         label: 'Adelantos',          acciones: ['ver', 'crear', 'aprobar', 'rechazar'] },
  { id: 'inventario_sim',    label: 'Inventario SIM',     acciones: ['ver', 'agregar', 'asignar'] },
  { id: 'oferta_comercial',  label: 'Oferta Comercial',   acciones: ['ver', 'crear', 'editar', 'eliminar'] },
  { id: 'configuracion',     label: 'Configuración',      acciones: ['ver', 'usuarios', 'equipos', 'metas', 'tipificaciones', 'api'] },
  { id: 'empresas',          label: 'Empresas',           acciones: ['ver', 'crear', 'editar', 'eliminar'] },
  { id: 'roles',             label: 'Gestión de Roles',   acciones: ['ver', 'editar'] },
] as const;

export const ROLES_SISTEMA = ['superadmin', 'admin', 'teamlead', 'user', 'developer'] as const;

// Permisos por defecto (refleja el estado actual del código)
export const DEFAULTS: Record<string, Record<string, string[]>> = {
  superadmin: {
    dashboard:         ['ver'],
    clientes_gpon:     ['ver', 'crear', 'editar', 'eliminar'],
    clientes_postpago: ['ver', 'crear', 'editar'],
    prospectos:        ['ver', 'solicitar', 'asignar', 'contactar'],
    interphone:        ['ver', 'llamar'],
    nomina:            ['ver', 'crear', 'aprobar', 'pagar', 'editar'],
    adelantos:         ['ver', 'crear', 'aprobar', 'rechazar'],
    inventario_sim:    ['ver', 'agregar', 'asignar'],
    oferta_comercial:  ['ver', 'crear', 'editar', 'eliminar'],
    configuracion:     ['ver', 'usuarios', 'equipos', 'metas', 'tipificaciones', 'api'],
    empresas:          ['ver', 'crear', 'editar', 'eliminar'],
    roles:             ['ver', 'editar'],
  },
  admin: {
    dashboard:         ['ver'],
    clientes_gpon:     ['ver', 'crear', 'editar'],
    clientes_postpago: ['ver', 'crear', 'editar'],
    prospectos:        ['ver', 'asignar', 'contactar'],
    interphone:        ['ver', 'llamar'],
    nomina:            ['ver', 'crear', 'aprobar', 'pagar', 'editar'],
    adelantos:         ['ver', 'aprobar', 'rechazar'],
    inventario_sim:    ['ver', 'agregar', 'asignar'],
    oferta_comercial:  ['ver', 'crear', 'editar', 'eliminar'],
    configuracion:     ['ver', 'usuarios', 'equipos', 'metas'],
    empresas:          [],
    roles:             [],
  },
  teamlead: {
    dashboard:         ['ver'],
    clientes_gpon:     ['ver', 'crear', 'editar'],
    clientes_postpago: ['ver', 'crear', 'editar'],
    prospectos:        ['ver', 'solicitar', 'contactar'],
    interphone:        ['ver', 'llamar'],
    nomina:            ['ver'],
    adelantos:         ['ver', 'crear'],
    inventario_sim:    [],
    oferta_comercial:  [],
    configuracion:     [],
    empresas:          [],
    roles:             [],
  },
  user: {
    dashboard:         ['ver'],
    clientes_gpon:     ['ver', 'crear'],
    clientes_postpago: ['ver', 'crear'],
    prospectos:        ['ver', 'solicitar', 'contactar'],
    interphone:        ['ver', 'llamar'],
    nomina:            ['ver'],
    adelantos:         ['ver', 'crear'],
    inventario_sim:    [],
    oferta_comercial:  [],
    configuracion:     [],
    empresas:          [],
    roles:             [],
  },
  developer: {
    dashboard:         [],
    clientes_gpon:     [],
    clientes_postpago: [],
    prospectos:        [],
    interphone:        [],
    nomina:            [],
    adelantos:         [],
    inventario_sim:    [],
    oferta_comercial:  [],
    configuracion:     ['ver', 'api'],
    empresas:          [],
    roles:             [],
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (!isSuperAdmin(session.role)) return res.status(403).json({ error: 'Solo superadmin' });

  if (req.method === 'GET') {
    const registros = await prisma.rolPermiso.findMany();

    // Construir mapa rol → pantalla → acciones
    const permisos: Record<string, Record<string, string[]>> = {};

    // Inicializar con defaults
    for (const rol of ROLES_SISTEMA) {
      permisos[rol] = {};
      for (const pantalla of PANTALLAS_CONFIG) {
        permisos[rol][pantalla.id] = DEFAULTS[rol]?.[pantalla.id] ?? [];
      }
    }

    // Sobrescribir con datos de DB si existen
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

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
