import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MainLayout } from '@/components/layout/main-layout';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CldImage } from 'next-cloudinary';
import { Search, Wifi } from 'lucide-react';
import { getPostpagoStatusLabel } from '@/lib/labels';
import { cn } from '@/lib/utils';

interface PostpagoClient {
  id: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  email: string | null;
  numeroIdentificacion: string;
  postpagoStatus: string | null;
  tipoPlanPostpago: string | null;
  cedulaFrontalUrl: string | null;
  cedulaTraseraUrl: string | null;
  selfieUrl: string | null;
  simCedulaUrl: string | null;
  simUrl: string | null;
  createdAt: string;
  plan: { nombre: string; productType: { nombre: string } | null } | null;
  creator: { nombre: string | null; apellidos: string | null; email: string };
}

function getCloudinaryPublicId(url: string | null): string | null {
  if (!url || !url.includes('cloudinary.com')) return null;
  const parts = url.split('/');
  const uploadIndex = parts.findIndex(p => p === 'upload');
  if (uploadIndex === -1) return null;
  const afterUpload = parts.slice(uploadIndex + 1);
  const versionIndex = afterUpload.findIndex(p => p.match(/^v\d+$/));
  const rest = versionIndex !== -1 ? afterUpload.slice(versionIndex + 1) : afterUpload;
  return rest.join('/').split('.')[0];
}

function statusVariant(status: string | null): 'pending' | 'success' | 'info' {
  if (status === 'ACTIVADA') return 'success';
  if (status === 'PENDIENTE_MENSAJERIA') return 'info';
  return 'pending';
}

function PhotoThumb({ url, label }: { url: string | null; label: string }) {
  if (!url) return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-[80px] h-[60px] rounded border border-dashed flex items-center justify-center bg-muted/40">
        <span className="text-[10px] text-muted-foreground text-center px-1">Sin foto</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );

  const publicId = getCloudinaryPublicId(url);
  return (
    <div className="flex flex-col items-center gap-1">
      <a href={url} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
        {publicId ? (
          <CldImage
            src={publicId}
            alt={label}
            width={80}
            height={60}
            className="rounded border object-cover w-[80px] h-[60px]"
            crop={{ type: 'auto', source: true }}
          />
        ) : (
          <img src={url} alt={label} className="rounded border object-cover w-[80px] h-[60px]" />
        )}
      </a>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

export default function ClientesPostpagoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<PostpagoClient[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const authRes = await fetch('/api/auth/me');
      if (!authRes.ok) { router.push('/login'); return; }
      const { user } = await authRes.json();
      if (user?.role !== 'admin') { router.push('/'); return; }

      const res = await fetch('/api/clients/postpago-list');
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const filtered = clients.filter(c => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      c.nombres.toLowerCase().includes(s) ||
      c.apellidos.toLowerCase().includes(s) ||
      c.numeroIdentificacion.includes(s) ||
      (c.telefono ?? '').includes(s)
    );
  });

  if (loading) return <MainLayout><TableSkeleton cols={5} rows={6} showFilters /></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wifi className="h-6 w-6 text-primary" />
              Clientes Postpago
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{clients.length} clientes registrados</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Wifi className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{search ? 'Sin resultados' : 'No hay clientes postpago registrados'}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map(client => (
              <Card key={client.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-semibold text-base leading-tight">
                            {client.nombres} {client.apellidos}
                          </p>
                          <p className="text-sm text-muted-foreground">{client.numeroIdentificacion}</p>
                        </div>
                        <Badge variant={statusVariant(client.postpagoStatus)}>
                          {getPostpagoStatusLabel(client.postpagoStatus)}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {client.telefono && <span>{client.telefono}</span>}
                        {client.email && <span>{client.email}</span>}
                        {client.plan && (
                          <span className="font-medium text-foreground">{client.plan.nombre}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Creado por {client.creator.nombre
                          ? `${client.creator.nombre} ${client.creator.apellidos ?? ''}`.trim()
                          : client.creator.email
                        } · {new Date(client.createdAt).toLocaleDateString('es-CR')}
                      </p>
                    </div>

                    {/* Fotos */}
                    <div className="flex flex-wrap gap-3 flex-shrink-0">
                      <PhotoThumb url={client.cedulaFrontalUrl} label="Cédula frontal" />
                      <PhotoThumb url={client.cedulaTraseraUrl} label="Cédula trasera" />
                      <PhotoThumb url={client.selfieUrl} label="Selfie c/ SIM" />
                      <PhotoThumb url={client.simCedulaUrl} label="SIM + cédula" />
                      <PhotoThumb url={client.simUrl} label="Foto SIM" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
