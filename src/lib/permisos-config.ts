/**
 * permisos-config.ts
 *
 * Constantes puras del sistema de permisos — SIN imports de servidor.
 * Pueden importarse tanto desde páginas cliente como desde APIs server-side.
 *
 * Para la lógica server (hasPermiso, getAcciones, etc.) usar @/lib/permisos.
 */

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

export type PantallaId = (typeof PANTALLAS_CONFIG)[number]['id'];

export const ROLES_SISTEMA = ['superadmin', 'admin', 'teamlead', 'user', 'developer'] as const;
export type RolSistema = (typeof ROLES_SISTEMA)[number];

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
