import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationsBell } from '@/components/ui/notifications-bell';
import { FloatingPlansButton } from '@/components/plans/floating-plans-button';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'Panel de Control',
  '/clients': 'Clientes',
  '/prospects': 'Prospectos',
  '/plans': 'Planes',
  '/configuracion': 'Configuración',
  '/profile': 'Mi Perfil',
  '/payroll': 'Nómina',
  '/advances': 'Adelantos',
};

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; role?: string; nombre?: string; apellidos?: string } | null>(null);

  const pageTitle = PAGE_TITLES[router.pathname] ?? 'Panel de Control';

  useEffect(() => {
    async function fetchUser() {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    }
    fetchUser();
  }, []);

  const displayName = user?.nombre && user?.apellidos
    ? `${user.nombre} ${user.apellidos}`
    : user?.email || 'Usuario';

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="text-base sm:text-lg font-semibold">{pageTitle}</h2>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <FloatingPlansButton />
        <NotificationsBell />
        <ThemeToggle />
        <div className="text-right hidden sm:block">
          <button
            onClick={() => router.push('/profile')}
            className="text-sm font-medium hover:text-primary transition-colors cursor-pointer"
          >
            {displayName}
          </button>
          <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
        </div>
      </div>
    </header>
  );
}