/**
 * PermisosContext — disponibiliza los permisos del usuario actual en toda la app.
 *
 * Fetch único a /api/mis-permisos al montar; comparte el resultado entre
 * el sidebar y todas las páginas sin peticiones duplicadas.
 *
 * Uso:
 *   const { can } = usePermisos();
 *   {can('clientes_gpon', 'crear') && <Button>Nuevo</Button>}
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

interface PermisosContextValue {
  /** Record<pantalla, acciones[]> — vacío mientras carga */
  permisos: Record<string, string[]>;
  /** true mientras el fetch inicial no ha completado */
  loading: boolean;
  /** Devuelve true si el usuario tiene la acción en la pantalla dada */
  can: (pantalla: string, accion: string) => boolean;
}

const PermisosContext = createContext<PermisosContextValue>({
  permisos: {},
  loading: true,
  can: () => false,
});

export function PermisosProvider({ children }: { children: React.ReactNode }) {
  const [permisos, setPermisos] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/mis-permisos')
      .then((r) => (r.ok ? r.json() : { permisos: {} }))
      .then((data) => setPermisos(data.permisos ?? {}))
      .catch(() => {/* sesión inactiva o red caída — sin permisos */ })
      .finally(() => setLoading(false));
  }, []);

  function can(pantalla: string, accion: string): boolean {
    return (permisos[pantalla] ?? []).includes(accion);
  }

  return (
    <PermisosContext.Provider value={{ permisos, loading, can }}>
      {children}
    </PermisosContext.Provider>
  );
}

/** Hook para consumir los permisos del usuario actual. */
export function usePermisos(): PermisosContextValue {
  return useContext(PermisosContext);
}
