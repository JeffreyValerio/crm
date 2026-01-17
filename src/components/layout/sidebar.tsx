import Link from 'next/link';
import { useRouter } from 'next/router';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { 
  Users, 
  LayoutDashboard, 
  Settings,
  LogOut,
  Package,
  UserCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  userOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Clientes',
    href: '/clients',
    icon: UserCircle,
  },
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

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && userRole !== 'admin') {
      return false;
    }
    if (item.userOnly && userRole === 'admin') {
      return false;
    }
    return true;
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
      <nav className="flex-1 space-y-1 p-4">
        {filteredNavItems.map((item) => {
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