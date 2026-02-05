import Link from 'next/link';
import { useRouter } from 'next/router';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { 
  Users, 
  LayoutDashboard, 
  LogOut,
  Package,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Receipt
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  userOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
  adminOnly?: boolean;
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
        title: 'Nómina',
        href: '/payroll',
        icon: Receipt,
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
        title: 'Usuarios',
        href: '/users',
        icon: Users,
        adminOnly: true,
      },
    ],
    adminOnly: true,
  },
];

export function Sidebar() {
  const router = useRouter();
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    // Cargar el estado desde localStorage, por defecto false (expandido)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });

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
    // Si la sección es solo para admin y el usuario no es admin, ocultarla
    if (section.adminOnly && userRole !== 'admin') {
      return false;
    }
    // Filtrar items dentro de cada sección
    const filteredItems = section.items.filter((item) => {
      if (item.adminOnly && userRole !== 'admin') {
        return false;
      }
      if (item.userOnly && userRole === 'admin') {
        return false;
      }
      return true;
    });
    // Solo mostrar la sección si tiene items visibles
    return filteredItems.length > 0;
  });

  return (
    <div className={cn(
      "flex h-screen flex-col border-r bg-card transition-all duration-300",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className={cn(
        "flex h-16 items-center border-b px-4",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {!isCollapsed && (
          <h1 className="text-xl font-bold text-primary">CRM</h1>
        )}
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors"
          aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          title={isCollapsed ? "Expandir" : "Colapsar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5 text-white" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-white" />
          )}
        </button>
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
              {!isCollapsed && (
                <div className="px-3 py-1.5">
                  <h2 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                    {section.title}
                  </h2>
                </div>
              )}
              {isCollapsed && sectionIndex > 0 && (
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
                      className={cn(
                        'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isCollapsed ? 'justify-center' : 'gap-3',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-white hover:bg-accent hover:text-accent-foreground'
                      )}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0 text-white" />
                      {!isCollapsed && (
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
            "flex items-center rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent hover:text-accent-foreground w-full",
            isCollapsed ? "justify-center" : "gap-3"
          )}
          title={isCollapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0 text-white" />
          {!isCollapsed && (
            <span className="whitespace-nowrap">Cerrar sesión</span>
          )}
        </button>
      </div>
    </div>
  );
}