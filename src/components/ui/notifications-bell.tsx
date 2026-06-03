import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  clientId: string | null;
  leida: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  if (h < 24) return `hace ${h}h`;
  return `hace ${d}d`;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnread(data.unread);
      }
    } catch { /* silencioso */ }
  }

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH' });
    setUnread(0);
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleOpen() {
    setOpen(prev => {
      const next = !prev;
      if (next && unread > 0) markAllRead();
      return next;
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Notificaciones</span>
            {notifications.some(n => !n.leida) && (
              <button
                onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    'border-b last:border-0 px-4 py-3 transition-colors',
                    !n.leida ? 'bg-primary/5' : ''
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn('text-sm', !n.leida && 'font-medium')}>{n.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.mensaje}</p>
                    </div>
                    {!n.leida && (
                      <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">{timeAgo(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
