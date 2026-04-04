import { useState, ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { FloatingPlansButton } from '@/components/plans/floating-plans-button';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
      <FloatingPlansButton />
    </div>
  );
}