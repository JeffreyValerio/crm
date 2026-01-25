import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; role?: string; nombre?: string; apellidos?: string } | null>(null);

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
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Panel de Control</h2>
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="text-right">
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