import Link from 'next/link';
import { useRouter } from 'next/router';
import * as React from 'react';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  userOnly?: boolean;
  roles?: string[]; // si se define, solo esos roles ven el item
}

interface NavSection {
  title: string;
  items: NavItem[];
  adminOnly?: boolean;
  roles?: string[]; // si se define, solo esos roles ven la sección
}

const navSections: NavSection[] = [
  {
    title: 'Principal',
    items: [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
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
  },
      {
        title: 'Prospectos',
        href: '/prospects',
        icon: Target,
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
      },
    ],
  },
  {
    title: 'Configuración',
    items: [
      {
        title: 'Planes',
        href: '/plans',
        icon: Package,
        adminOnly: true,
      },
      {
        title: 'Configuración',
        href: '/configuracion',
        icon: Settings,
        roles: ['admin', 'developer'],
      },
    ],
    roles: ['admin', 'developer'],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const router = useRouter();
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') setIsCollapsed(true);
  }, []);

  React.useEffect(() => {
    async function checkRole() {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.user?.role || null);
      }
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

  const filteredSections = navSections.filter((section) => {
    if (section.roles && userRole && !section.roles.includes(userRole)) return false;
    if (section.adminOnly && userRole !== 'admin') return false;
    // Filtrar items dentro de cada sección
    const filteredItems = section.items.filter((item) => {
      if (item.roles && userRole && !item.roles.includes(userRole)) return false;
      if (item.adminOnly && userRole !== 'admin') return false;
      if (item.userOnly && userRole === 'admin') return false;
      return true;
    });
    // Solo mostrar la sección si tiene items visibles
    return filteredItems.length > 0;
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
        {filteredSections.map((section, sectionIndex) => {
          const filteredItems = section.items.filter((item) => {
            if (item.adminOnly && userRole !== 'admin') {
              return false;
            }
            if (item.userOnly && userRole === 'admin') {
              return false;
            }
            return true;
          });

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
              title={collapsed ? item.title : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <span className="whitespace-nowrap">{item.title}</span>
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