import { useEffect, useRef, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Trash2, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SimCard {
  id: string;
  numero: string;
  fotoUrl: string | null;
  estado: string;
  createdAt: string;
}

type Filtro = 'SIN_ASIGNAR' | 'ASIGNADO' | 'TODOS';

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'SIN_ASIGNAR', label: 'Sin asignar' },
  { value: 'ASIGNADO', label: 'Asignadas' },
  { value: 'TODOS', label: 'Todas' },
];

export default function SimsPage() {
  const [loading, setLoading] = useState(true);
  const [sims, setSims] = useState<SimCard[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('SIN_ASIGNAR');
  const [numero, setNumero] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoPublicId, setFotoPublicId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSims(); }, []);

  async function loadSims() {
    setLoading(true);
    try {
      const res = await fetch('/api/sims');
      const data = await res.json();
      setSims(data.sims || []);
    } finally {
      setLoading(false);
    }
  }

  const simsVisibles = filtro === 'TODOS' ? sims : sims.filter(s => s.estado === filtro);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/clients/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Error al subir imagen');
      const data = await res.json();
      setFotoUrl(data.url);
      setFotoPublicId(data.public_id);
    } catch {
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  function clearFoto() {
    setFotoUrl(null);
    setFotoPublicId(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!numero.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/sims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: numero.trim(), fotoUrl, fotoPublicId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Error al agregar'); return; }
      toast.success('SIM agregada');
      setNumero('');
      clearFoto();
      loadSims();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sim: SimCard) {
    if (!confirm(`¿Eliminar SIM ${sim.numero}?`)) return;
    setDeletingId(sim.id);
    try {
      const res = await fetch(`/api/sims/${sim.id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Error al eliminar'); return; }
      toast.success('SIM eliminada');
      setSims(prev => prev.filter(s => s.id !== sim.id));
    } finally {
      setDeletingId(null);
    }
  }

  const sinAsignar = sims.filter(s => s.estado === 'SIN_ASIGNAR').length;
  const asignadas = sims.filter(s => s.estado === 'ASIGNADO').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario SIM</h1>
          <p className="text-muted-foreground text-sm">
            {sims.length} total · {sinAsignar} disponible{sinAsignar !== 1 ? 's' : ''} · {asignadas} asignada{asignadas !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Formulario agregar */}
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 items-start">
          <Input
            placeholder="Número de SIM"
            value={numero}
            onChange={e => setNumero(e.target.value)}
            className="sm:w-72"
            required
          />

          <div className="flex items-center gap-2">
            {fotoUrl ? (
              <div className="relative">
                <img src={fotoUrl} alt="SIM" className="h-10 w-10 rounded object-cover border" />
                <button
                  type="button"
                  onClick={clearFoto}
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Subiendo...' : 'Foto'}
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <Button type="submit" disabled={saving || uploading || !numero.trim()}>
            {saving ? 'Guardando...' : 'Agregar'}
          </Button>
        </form>

        {/* Filtros */}
        <div className="flex gap-2">
          {FILTROS.map(f => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filtro === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
              {f.value !== 'TODOS' && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({f.value === 'SIN_ASIGNAR' ? sinAsignar : asignadas})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tabla */}
        {loading ? (
          <TableSkeleton cols={4} rows={8} />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foto</TableHead>
                  <TableHead>Número SIM</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha registro</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simsVisibles.length === 0 ? (
                  <TableEmptyState colSpan={5} message="No hay SIMs en esta categoría" />
                ) : simsVisibles.map(sim => (
                  <TableRow key={sim.id}>
                    <TableCell>
                      {sim.fotoUrl ? (
                        <img
                          src={sim.fotoUrl}
                          alt={sim.numero}
                          className="h-10 w-10 rounded object-cover border cursor-pointer"
                          onClick={() => window.open(sim.fotoUrl!, '_blank')}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center text-muted-foreground text-xs">
                          —
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-medium">{sim.numero}</TableCell>
                    <TableCell>
                      <Badge variant={sim.estado === 'SIN_ASIGNAR' ? 'success' : 'default'}>
                        {sim.estado === 'SIN_ASIGNAR' ? 'Disponible' : 'Asignada'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(sim.createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sim)}
                        disabled={deletingId === sim.id}
                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      >
                        {deletingId === sim.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
