# Prospects Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear módulo de Prospectos en el CRM: modelo Prisma, script de importación automática desde `scripts/data.json`, API REST y página `/prospects` con tabla, búsqueda, detalle y asignación a usuarios.

**Architecture:** Modelo `Prospecto` en Prisma con todos los campos del scraper + FK `asignadoA → User`. Script Node.js `scripts/import-prospectos.js` lee `data.json` y hace upsert masivo. API en `src/pages/api/prospects/`. Página en `src/pages/prospects/index.tsx` siguiendo patrones de `clients/`.

**Tech Stack:** Next.js Pages Router, Prisma ORM, PostgreSQL, TypeScript, componentes UI del proyecto (`Badge`, `Table`, `Dialog`, `TableSkeleton`), iron-session, lucide-react.

---

## Archivos a crear/modificar

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Modify | `prisma/schema.prisma` | Agregar modelo `Prospecto` |
| Create | `scripts/import-prospectos.js` | Leer data.json → upsert en DB |
| Create | `src/pages/api/prospects/index.ts` | GET lista paginada, POST bulk |
| Create | `src/pages/api/prospects/[id].ts` | GET detalle, PATCH asignar/editar |
| Create | `src/pages/prospects/index.tsx` | Página principal de prospectos |
| Modify | `src/components/layout/sidebar.tsx` | Agregar link Prospectos |

---

### Task 1: Modelo Prisma

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar modelo `Prospecto` al schema**

Abrir `prisma/schema.prisma` y agregar al final:

```prisma
model Prospecto {
  id                String   @id @default(cuid())
  // Datos de la orden
  nroOrden          String   @unique
  estado            String?
  prioridad         String?
  idCliente         String?
  contrato          String?
  contratoLigado    String?
  tipoOrden         String?
  tipoServicio      String?
  tipoAveria        String?
  motivo            String?
  descripcion       String?
  tecnico           String?
  usuarioCreador    String?
  usuarioEnvio      String?
  // Contacto
  cliente           String?
  contactoNombre    String?
  contactoApellido  String?
  telCelular        String?
  telInstalacion    String?
  telOficina        String?
  email             String?
  // Ubicación
  sucursal          String?
  despacho          String?
  provincia         String?
  canton            String?
  distrito          String?
  barrio            String?
  direccion         String?
  // Datos técnicos
  observaciones     String?
  banderaCable      String?
  banderaInternet   String?
  facturador        String?
  tap               String?
  placa             String?
  poste             String?
  latitud           String?
  longitud          String?
  // Gestión interna
  observacionesInternas String?
  asignadoA         String?
  asignado          User?    @relation(fields: [asignadoA], references: [id])
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([asignadoA])
  @@index([estado])
  @@index([cliente])
}
```

- [ ] **Step 2: Agregar relación inversa en modelo `User`**

En el modelo `User` existente, agregar dentro del bloque (junto a las demás relaciones):

```prisma
  prospectos        Prospecto[]
```

- [ ] **Step 3: Generar y aplicar migración**

```bash
npm run db:migrate
# Cuando pida nombre: prospects-feature
```

Esperado: `✔ Your database is now in sync with your schema.`

- [ ] **Step 4: Verificar cliente generado**

```bash
npm run db:generate
```

Esperado: `✔ Generated Prisma Client`

---

### Task 2: Script de importación

**Files:**
- Create: `scripts/import-prospectos.js`

- [ ] **Step 1: Crear el script**

```javascript
// scripts/import-prospectos.js
const { PrismaClient } = require('../src/generated/prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const dataPath = path.join(__dirname, 'data.json');

  if (!fs.existsSync(dataPath)) {
    console.error('No se encontró scripts/data.json — ejecuta el scraper primero.');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const registros = Array.isArray(raw) ? raw : [];

  console.log(`Importando ${registros.length} prospectos...`);

  let importados = 0;
  let omitidos = 0;

  for (const r of registros) {
    if (!r.nro_orden || r._error) {
      omitidos++;
      continue;
    }

    await prisma.prospecto.upsert({
      where: { nroOrden: r.nro_orden },
      update: {
        estado:           r.estado           || null,
        prioridad:        r.prioridad        || null,
        idCliente:        r.id_cliente       || null,
        contrato:         r.contrato         || null,
        contratoLigado:   r.contrato_ligado  || null,
        tipoOrden:        r.tipo_orden       || null,
        tipoServicio:     r.tipo_servicio    || null,
        tipoAveria:       r.tipo_averia      || null,
        motivo:           r.motivo           || null,
        descripcion:      r.descripcion      || null,
        tecnico:          r.tecnico          || null,
        usuarioCreador:   r.usuario_creador  || null,
        usuarioEnvio:     r.usuario_envio    || null,
        cliente:          r.cliente          || null,
        contactoNombre:   r.contacto_nombre  || null,
        contactoApellido: r.contacto_apellido|| null,
        telCelular:       r.tel_celular      || null,
        telInstalacion:   r.tel_instalacion  || null,
        telOficina:       r.tel_oficina      || null,
        email:            r.email            || null,
        sucursal:         r.sucursal         || null,
        despacho:         r.despacho         || null,
        provincia:        r.provincia        || null,
        canton:           r.canton           || null,
        distrito:         r.distrito         || null,
        barrio:           r.barrio           || null,
        direccion:        r.direccion        || null,
        observaciones:    r.observaciones    || null,
        banderaCable:     r.bandera_cable    || null,
        banderaInternet:  r.bandera_internet || null,
        facturador:       r.facturador       || null,
        tap:              r.tap              || null,
        placa:            r.placa            || null,
        poste:            r.poste            || null,
        latitud:          r.latitud          || null,
        longitud:         r.longitud         || null,
      },
      create: {
        nroOrden:         r.nro_orden,
        estado:           r.estado           || null,
        prioridad:        r.prioridad        || null,
        idCliente:        r.id_cliente       || null,
        contrato:         r.contrato         || null,
        contratoLigado:   r.contrato_ligado  || null,
        tipoOrden:        r.tipo_orden       || null,
        tipoServicio:     r.tipo_servicio    || null,
        tipoAveria:       r.tipo_averia      || null,
        motivo:           r.motivo           || null,
        descripcion:      r.descripcion      || null,
        tecnico:          r.tecnico          || null,
        usuarioCreador:   r.usuario_creador  || null,
        usuarioEnvio:     r.usuario_envio    || null,
        cliente:          r.cliente          || null,
        contactoNombre:   r.contacto_nombre  || null,
        contactoApellido: r.contacto_apellido|| null,
        telCelular:       r.tel_celular      || null,
        telInstalacion:   r.tel_instalacion  || null,
        telOficina:       r.tel_oficina      || null,
        email:            r.email            || null,
        sucursal:         r.sucursal         || null,
        despacho:         r.despacho         || null,
        provincia:        r.provincia        || null,
        canton:           r.canton           || null,
        distrito:         r.distrito         || null,
        barrio:           r.barrio           || null,
        direccion:        r.direccion        || null,
        observaciones:    r.observaciones    || null,
        banderaCable:     r.bandera_cable    || null,
        banderaInternet:  r.bandera_internet || null,
        facturador:       r.facturador       || null,
        tap:              r.tap              || null,
        placa:            r.placa            || null,
        poste:            r.poste            || null,
        latitud:          r.latitud          || null,
        longitud:         r.longitud         || null,
      },
    });
    importados++;
  }

  console.log(`✓ Importados: ${importados} | Omitidos: ${omitidos}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Agregar script en `package.json`**

En `package.json`, dentro de `"scripts"`, agregar:

```json
"prospects:import": "node scripts/import-prospectos.js"
```

- [ ] **Step 3: Probar importación**

```bash
npm run prospects:import
```

Esperado:
```
Importando 41 prospectos...
✓ Importados: 41 | Omitidos: 0
```

- [ ] **Step 4: Verificar en DB**

```bash
node -e "const {PrismaClient}=require('./src/generated/prisma/client');const p=new PrismaClient();p.prospecto.count().then(c=>{console.log('Total prospectos en DB:',c);p.\$disconnect()})"
```

Esperado: `Total prospectos en DB: 41`

---

### Task 3: API GET y PATCH

**Files:**
- Create: `src/pages/api/prospects/index.ts`
- Create: `src/pages/api/prospects/[id].ts`

- [ ] **Step 1: Crear `src/pages/api/prospects/index.ts`**

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  if (req.method === 'GET') {
    const { search, asignadoA, page = '1', limit = '15' } = req.query;

    const where: any = {};

    // Control de acceso
    if (session.role !== 'admin') {
      where.asignadoA = session.userId;
    } else if (asignadoA) {
      where.asignadoA = asignadoA === 'sin_asignar' ? null : asignadoA;
    }

    // Búsqueda por texto
    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      const searchConds = [
        { cliente: { contains: s, mode: 'insensitive' } },
        { nroOrden: { contains: s, mode: 'insensitive' } },
        { idCliente: { contains: s, mode: 'insensitive' } },
        { telCelular: { contains: s, mode: 'insensitive' } },
        { telOficina: { contains: s, mode: 'insensitive' } },
        { despacho: { contains: s, mode: 'insensitive' } },
      ];
      if (Object.keys(where).length > 0) {
        where.AND = [{ ...where }, { OR: searchConds }];
        // Limpiar keys duplicadas
        Object.keys(where).forEach(k => { if (k !== 'AND') delete where[k]; });
      } else {
        where.OR = searchConds;
      }
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [total, prospectos] = await Promise.all([
      prisma.prospecto.count({ where }),
      prisma.prospecto.findMany({
        where,
        include: {
          asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    return res.status(200).json({
      prospectos,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
```

- [ ] **Step 2: Crear `src/pages/api/prospects/[id].ts`**

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID inválido' });

  if (req.method === 'GET') {
    const prospecto = await prisma.prospecto.findUnique({
      where: { id },
      include: {
        asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
      },
    });
    if (!prospecto) return res.status(404).json({ error: 'No encontrado' });

    // Usuarios solo pueden ver sus asignados
    if (session.role !== 'admin' && prospecto.asignadoA !== session.userId) {
      return res.status(403).json({ error: 'Sin acceso' });
    }

    return res.status(200).json({ prospecto });
  }

  if (req.method === 'PATCH') {
    if (session.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });

    const { asignadoA, observacionesInternas } = req.body;

    const data: any = {};
    if (asignadoA !== undefined) data.asignadoA = asignadoA || null;
    if (observacionesInternas !== undefined) data.observacionesInternas = observacionesInternas;

    const prospecto = await prisma.prospecto.update({
      where: { id },
      data,
      include: {
        asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
      },
    });

    return res.status(200).json({ prospecto });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
```

- [ ] **Step 3: Probar endpoints**

Con el servidor corriendo (`npm run dev`):

```bash
# GET lista (como admin con cookie de sesión activa)
curl http://localhost:3000/api/prospects

# Esperado: { prospectos: [...], pagination: { total: 41, ... } }
```

---

### Task 4: Página `/prospects`

**Files:**
- Create: `src/pages/prospects/index.tsx`

- [ ] **Step 1: Crear la página**

```tsx
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Search, ChevronLeft, ChevronRight, UserCheck, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Usuario {
  id: string;
  nombre: string | null;
  apellidos: string | null;
  email: string;
}

interface Prospecto {
  id: string;
  nroOrden: string;
  cliente: string | null;
  idCliente: string | null;
  estado: string | null;
  prioridad: string | null;
  tipoOrden: string | null;
  motivo: string | null;
  descripcion: string | null;
  tecnico: string | null;
  usuarioCreador: string | null;
  usuarioEnvio: string | null;
  contactoNombre: string | null;
  contactoApellido: string | null;
  telCelular: string | null;
  telInstalacion: string | null;
  telOficina: string | null;
  email: string | null;
  sucursal: string | null;
  despacho: string | null;
  provincia: string | null;
  canton: string | null;
  distrito: string | null;
  barrio: string | null;
  direccion: string | null;
  observaciones: string | null;
  observacionesInternas: string | null;
  banderaCable: string | null;
  banderaInternet: string | null;
  facturador: string | null;
  tap: string | null;
  placa: string | null;
  poste: string | null;
  latitud: string | null;
  longitud: string | null;
  asignadoA: string | null;
  asignado: Usuario | null;
  createdAt: string;
}

export default function ProspectsPage() {
  const [loading, setLoading] = useState(true);
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [session, setSession] = useState<{ role: string; userId: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAsignado, setFilterAsignado] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewingProspecto, setViewingProspecto] = useState<Prospecto | null>(null);
  const [assigningProspecto, setAssigningProspecto] = useState<Prospecto | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [obsInternas, setObsInternas] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const LIMIT = 15;

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setSession(d));
  }, []);

  useEffect(() => {
    if (!session) return;
    if (session.role === 'admin') {
      fetch('/api/users').then(r => r.json()).then(d => setUsuarios(d.users || []));
    }
    fetchProspectos(1);
  }, [session]);

  async function fetchProspectos(page: number) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (filterAsignado) params.set('asignadoA', filterAsignado);
    try {
      const res = await fetch(`/api/prospects?${params}`);
      const data = await res.json();
      setProspectos(data.prospectos || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
      setCurrentPage(page);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchProspectos(1);
  }

  function openAssign(p: Prospecto) {
    setAssigningProspecto(p);
    setAssignUserId(p.asignadoA || '');
    setObsInternas(p.observacionesInternas || '');
  }

  async function handleAssign() {
    if (!assigningProspecto) return;
    setAssignLoading(true);
    try {
      const res = await fetch(`/api/prospects/${assigningProspecto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asignadoA: assignUserId || null, observacionesInternas: obsInternas }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      toast.success('Prospecto actualizado');
      setAssigningProspecto(null);
      fetchProspectos(currentPage);
    } catch {
      toast.error('Error al actualizar prospecto');
    } finally {
      setAssignLoading(false);
    }
  }

  function estadoBadgeVariant(estado: string | null) {
    if (!estado) return 'default';
    const e = estado.toUpperCase();
    if (e === 'ASIGNADA') return 'warning';
    if (e === 'FINALIZADA') return 'success';
    if (e === 'CANCELADA') return 'destructive';
    return 'info';
  }

  function nombreUsuario(u: Usuario | null) {
    if (!u) return '—';
    return [u.nombre, u.apellidos].filter(Boolean).join(' ') || u.email;
  }

  if (!session) return <TableSkeleton cols={6} rows={10} showFilters />;

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prospectos</h1>
            <p className="text-muted-foreground text-sm">
              {total} prospecto{total !== 1 ? 's' : ''} {session.role !== 'admin' ? 'asignados a ti' : 'en total'}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, N° orden, cédula, teléfono..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline">Buscar</Button>
          </form>

          {session.role === 'admin' && (
            <Select
              value={filterAsignado}
              onChange={e => { setFilterAsignado(e.target.value); fetchProspectos(1); }}
              className="w-48"
            >
              <option value="">Todos</option>
              <option value="sin_asignar">Sin asignar</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{nombreUsuario(u)}</option>
              ))}
            </Select>
          )}
        </div>

        {/* Tabla */}
        {loading ? (
          <TableSkeleton cols={6} rows={10} />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>N° Orden</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Despacho</TableHead>
                  <TableHead>Tipo Orden</TableHead>
                  <TableHead>Estado</TableHead>
                  {session.role === 'admin' && <TableHead>Asignado a</TableHead>}
                  <TableHead className="w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospectos.length === 0 ? (
                  <TableEmptyState
                    colSpan={session.role === 'admin' ? 8 : 7}
                    message="No hay prospectos que coincidan"
                  />
                ) : (
                  prospectos.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <div>{p.cliente || '—'}</div>
                        <div className="text-xs text-muted-foreground">{p.idCliente || ''}</div>
                      </TableCell>
                      <TableCell className="text-sm">{p.nroOrden}</TableCell>
                      <TableCell className="text-sm">{p.telCelular || p.telOficina || '—'}</TableCell>
                      <TableCell className="text-sm">{p.despacho || '—'}</TableCell>
                      <TableCell className="text-sm">{p.tipoOrden || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={estadoBadgeVariant(p.estado)}>
                          {p.estado || '—'}
                        </Badge>
                      </TableCell>
                      {session.role === 'admin' && (
                        <TableCell className="text-sm">
                          {p.asignado ? (
                            <span className="text-foreground">{nombreUsuario(p.asignado)}</span>
                          ) : (
                            <span className="text-muted-foreground italic">Sin asignar</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingProspecto(p)}
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {session.role === 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAssign(p)}
                              title="Asignar"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => fetchProspectos(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => fetchProspectos(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog detalle */}
      {viewingProspecto && (
        <Dialog open onOpenChange={() => setViewingProspecto(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalle del Prospecto</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Cliente', viewingProspecto.cliente],
                ['N° Orden', viewingProspecto.nroOrden],
                ['ID Cliente', viewingProspecto.idCliente],
                ['Estado', viewingProspecto.estado],
                ['Prioridad', viewingProspecto.prioridad],
                ['Contrato', viewingProspecto.contrato],
                ['Contrato Ligado', viewingProspecto.contratoLigado],
                ['Tipo Orden', viewingProspecto.tipoOrden],
                ['Motivo', viewingProspecto.motivo],
                ['Técnico', viewingProspecto.tecnico],
                ['Usuario Creador', viewingProspecto.usuarioCreador],
                ['Usuario Envío', viewingProspecto.usuarioEnvio],
                ['Contacto', [viewingProspecto.contactoNombre, viewingProspecto.contactoApellido].filter(Boolean).join(' ')],
                ['Tel. Celular', viewingProspecto.telCelular],
                ['Tel. Instalación', viewingProspecto.telInstalacion],
                ['Tel. Oficina', viewingProspecto.telOficina],
                ['Email', viewingProspecto.email],
                ['Sucursal', viewingProspecto.sucursal],
                ['Despacho', viewingProspecto.despacho],
                ['Provincia', viewingProspecto.provincia],
                ['Cantón', viewingProspecto.canton],
                ['Distrito', viewingProspecto.distrito],
                ['Barrio', viewingProspecto.barrio],
                ['Dirección', viewingProspecto.direccion],
                ['Observaciones', viewingProspecto.observaciones],
                ['Bandera Cable', viewingProspecto.banderaCable],
                ['Bandera Internet', viewingProspecto.banderaInternet],
                ['Facturador', viewingProspecto.facturador],
                ['Tap', viewingProspecto.tap],
                ['Placa', viewingProspecto.placa],
                ['Poste', viewingProspecto.poste],
                ['Latitud', viewingProspecto.latitud],
                ['Longitud', viewingProspecto.longitud],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <span className="font-medium text-muted-foreground">{label}</span>
                  <p className="mt-0.5">{value || '—'}</p>
                </div>
              ))}
              {viewingProspecto.observacionesInternas && (
                <div className="col-span-2">
                  <span className="font-medium text-muted-foreground">Observaciones Internas</span>
                  <p className="mt-0.5">{viewingProspecto.observacionesInternas}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog asignar */}
      {assigningProspecto && session.role === 'admin' && (
        <Dialog open onOpenChange={() => setAssigningProspecto(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Prospecto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Prospecto</p>
                <p className="text-sm text-muted-foreground">{assigningProspecto.cliente} — {assigningProspecto.nroOrden}</p>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Asignar a</label>
                <Select value={assignUserId} onChange={e => setAssignUserId(e.target.value)}>
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{nombreUsuario(u)}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Observaciones internas</label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                  rows={3}
                  value={obsInternas}
                  onChange={e => setObsInternas(e.target.value)}
                  placeholder="Notas internas sobre este prospecto..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssigningProspecto(null)}>Cancelar</Button>
              <Button onClick={handleAssign} disabled={assignLoading}>
                {assignLoading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
}
```

- [ ] **Step 2: Verificar que la página carga sin errores**

```bash
npm run dev
# Abrir http://localhost:3000/prospects
```

Esperado: tabla de prospectos con paginación, búsqueda y botones de acción.

---

### Task 5: Sidebar

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Importar ícono y agregar item al sidebar**

En `src/components/layout/sidebar.tsx`, agregar `Target` a los imports de lucide-react:

```tsx
import { 
  Users, 
  LayoutDashboard, 
  LogOut,
  Package,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Target
} from 'lucide-react';
```

En el array `navSections`, dentro de la sección `'Operaciones'`, agregar después de `Clientes`:

```tsx
{
  title: 'Prospectos',
  href: '/prospects',
  icon: Target,
},
```

- [ ] **Step 2: Verificar navegación**

```bash
# Con npm run dev corriendo
# Verificar que el link Prospectos aparece en el sidebar y navega a /prospects
```

---

### Task 6: Commit final

- [ ] **Step 1: Commit**

```bash
git add prisma/schema.prisma scripts/import-prospectos.js src/pages/api/prospects/ src/pages/prospects/ src/components/layout/sidebar.tsx package.json
git commit -m "feat: módulo de prospectos con importación automática y asignación a usuarios"
```
