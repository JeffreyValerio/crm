import Link from 'next/link';
import { useRouter } from 'next/router';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { isAdmin } from '@/lib/roles';
import {
  LayoutDashboard,
  LogOut,
  Package,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Target,
  Settings,
  Phone,
  Wifi,
  Cpu,
  Building2,
  ShieldCheck,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  userOnly?: boolean;
  roles?: string[];   // si se define, solo esos roles ven el item (hard gate)
  pantalla?: string;  // si se define, se exige permiso 'ver' en esa pantalla (DB gate)
}

interface NavSection {
  title: string;
  items: NavItem[];
  adminOnly?: boolean;
  roles?: string[];   // hard gate a nivel sección
}

const navSections: NavSection[] = [
  {
    title: 'Principal',
    items: [
      {
        title: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        pantalla: 'dashboard',
      },
    ],
  },
  {
    title: 'Operaciones',
    items: [
      {
        title: 'Clientes',
        href: '/clients',
        icon: UserCircle,
        pantalla: 'clientes_gpon',
      },
      {
        title: 'Prospectos',
        href: '/prospects',
        icon: Target,
        pantalla: 'prospectos',
      },
      {
        title: 'Postpago',
        href: '/clientes-postpago',
        icon: Wifi,
        pantalla: 'clientes_postpago',
      },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      {
        title: 'Interphone',
        href: '/interphone',
        icon: Phone,
        pantalla: 'interphone',
      },
    ],
  },
  {
    title: 'Administración',
    items: [
      {
        title: 'Empresas',
        href: '/empresas',
        icon: Building2,
        roles: ['superadmin'],
      },
      {
        title: 'Roles',
        href: '/roles',
        icon: ShieldCheck,
        roles: ['superadmin'],
      },
    ],
    roles: ['superadmin'],
  },
  {
    title: 'Configuración',
    items: [
      {
        title: 'Inventario SIM',
        href: '/sims',
        icon: Cpu,
        pantalla: 'inventario_sim',
      },
      {
        title: 'Oferta Comercial',
        href: '/plans',
        icon: Package,
        pantalla: 'oferta_comercial',
      },
      {
        title: 'Configuración',
        href: '/configuracion',
        icon: Settings,
        pantalla: 'configuracion',
      },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const router = useRouter();
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [empresaNombre, setEmpresaNombre] = React.useState<string | null>(null);
  const [roleLoaded, setRoleLoaded] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  // Permisos del usuario actual, indexados por pantalla → acciones[]
  const [permisos, setPermisos] = React.useState<Record<string, string[]>>({});

  React.useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') setIsCollapsed(true);
  }, []);

  React.useEffect(() => {
    async function checkRole() {
      const [meRes, permisosRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/mis-permisos'),
      ]);
      if (meRes.ok) {
        const data = await meRes.json();
        setUserRole(data.user?.role || null);
        setEmpresaNombre(data.user?.empresaNombre || null);
      }
      if (permisosRes.ok) {
        const data = await permisosRes.json();
        setPermisos(data.permisos ?? {});
      }
      setRoleLoaded(true);
    }
    checkRole();
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  /** Determina si un item es visible para el usuario actual */
  function itemVisible(item: NavItem): boolean {
    // Hard gate por rol (Empresas, Roles, etc.)
    if (item.roles && userRole && !item.roles.includes(userRole)) return false;
    if (item.adminOnly && !isAdmin(userRole)) return false;
    if (item.userOnly && isAdmin(userRole)) return false;

    // Gate dinámico por permiso 'ver' en la pantalla correspondiente
    if (item.pantalla) {
      const acciones: string[] = permisos[item.pantalla] ?? [];
      if (!acciones.includes('ver')) return false;
    }

    return true;
  }

  const filteredSections = navSections
    .filter((section) => {
      // Hard gate de sección (ej: Administración solo superadmin)
      if (section.roles && userRole && !section.roles.includes(userRole)) return false;
      if (section.adminOnly && !isAdmin(userRole)) return false;
      // La sección se muestra si al menos un item es visible
      return section.items.some(itemVisible);
    });

  // En móvil, cerrar al navegar
  const handleNavClick = () => {
    if (onMobileClose) onMobileClose();
  };

  // En móvil siempre mostrar expandido
  const collapsed = mobileOpen ? false : isCollapsed;

  return (
    <div className={cn(
      "flex h-screen flex-col border-r bg-card transition-all duration-300",
      // Desktop: siempre visible, colapsable
      "hidden lg:flex",
      isCollapsed ? "lg:w-20" : "lg:w-64",
      // Móvil: drawer fijo encima del contenido
      mobileOpen && "fixed inset-y-0 left-0 z-50 flex w-72"
    )}>
      <div className={cn(
        "flex h-16 items-center border-b px-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <h1 className="text-xl font-bold text-primary">CRM</h1>
        )}
        {!mobileOpen && (
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors"
            aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 text-foreground" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-foreground" />
            )}
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {!roleLoaded ? null : filteredSections.map((section, sectionIndex) => {
          const filteredItems = section.items.filter(itemVisible);

          if (filteredItems.length === 0) return null;

          return (
            <div key={sectionIndex} className="space-y-2">
              {!collapsed && (
                <div className="px-3 py-1.5">
                  <h2 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                    {section.title}
                  </h2>
                </div>
              )}
              {collapsed && sectionIndex > 0 && (
                <div className="h-px bg-border/50 mx-2" />
              )}
              <div className="space-y-1">
                {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                collapsed ? 'justify-center' : 'gap-3',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              title={collapsed ? (item.href === '/interphone' && empresaNombre?.toUpperCase() === 'PIKI' ? 'Call My Way' : item.title) : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <span className="whitespace-nowrap">
                  {item.href === '/interphone' && empresaNombre?.toUpperCase() === 'PIKI' ? 'Call My Way' : item.title}
                </span>
              )}
            </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground w-full",
            collapsed ? "justify-center" : "gap-3"
          )}
          title={collapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && (
            <span className="whitespace-nowrap">Cerrar sesión</span>
          )}
        </button>
      </div>
    </div>
  );
}