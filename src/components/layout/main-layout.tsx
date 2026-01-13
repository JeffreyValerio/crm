import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { FloatingPlansButton } from '@/components/plans/floating-plans-button';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <FloatingPlansButton />
    </div>
  );
}