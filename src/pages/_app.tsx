import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { PermisosProvider } from '@/contexts/permisos-context';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PermisosProvider>
        <Component {...pageProps} />
        <Toaster />
      </PermisosProvider>
    </ThemeProvider>
  );
}