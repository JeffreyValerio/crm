# Prospectos — Contactación, Detalle y Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar tracking de contactación a prospectos (método + contador + alerta >2 días), rediseñar el detalle con secciones y botones de copia, y mostrar información de prospectos en el Dashboard.

**Architecture:** Se extiende el modelo Prospecto con 3 campos de contactación. Dos nuevos endpoints API manejan el registro de contacto y las estadísticas para el dashboard. La UI de prospectos se rediseña con botones de acción rápida en la tabla y un dialog reorganizado. El dashboard recibe nuevas tarjetas y una card de resumen por agente (solo admin). También se corrige el bug del botón Asignar en producción.

**Tech Stack:** Next.js Pages Router, Prisma ORM (PostgreSQL), TypeScript, Tailwind CSS, shadcn-inspired UI components en `src/components/ui/`, iron-session para auth.

---

## File Map

| Archivo | Acción |
|---|---|
| `prisma/schema.prisma` | Modify — agregar campos a `Prospecto` |
| `src/pages/api/prospects/[id]/contactar.ts` | Create — endpoint registrar contacto |
| `src/pages/api/prospects/stats.ts` | Create — endpoint stats por agente para dashboard |
| `src/pages/api/prospects/[id].ts` | Modify — permitir a usuarios editar `observacionesInternas` |
| `src/pages/prospects/index.tsx` | Modify — rediseño completo tabla + dialog |
| `src/pages/index.tsx` | Modify — nuevas tarjetas + card contactación |

---

## Task 1: Schema — Campos de contactación en Prospecto

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar campos al modelo Prospecto**

En `prisma/schema.prisma`, dentro del modelo `Prospecto`, agregar los 3 campos nuevos justo antes del bloque de gestión interna (antes de `observacionesInternas`):

```prisma
  // Contactación
  metodoContacto    String?   // "LLAMADA" | "WHATSAPP"
  totalContactos    Int       @default(0)
  ultimoContacto    DateTime?
```

El bloque completo de gestión interna queda así:

```prisma
  // Contactación
  metodoContacto    String?
  totalContactos    Int       @default(0)
  ultimoContacto    DateTime?
  // Gestión interna
  observacionesInternas String?
  asignadoA         String?
  asignado          User?    @relation(fields: [asignadoA], references: [id])
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
```

- [ ] **Step 2: Regenerar el cliente Prisma y crear migración**

```bash
npx prisma migrate dev --name add_contactacion_to_prospecto
```

Salida esperada: `Your database is now in sync with your schema.`

- [ ] **Step 3: Verificar que el cliente TypeScript reconoce los campos**

```bash
npm run db:generate
```

No debe haber errores.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add contactacion fields to Prospecto model"
```

---

## Task 2: API — Endpoint para registrar contacto

**Files:**
- Create: `src/pages/api/prospects/[id]/contactar.ts`

- [ ] **Step 1: Crear directorio y archivo**

Crear `src/pages/api/prospects/[id]/contactar.ts` con el siguiente contenido:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID inválido' });

  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Método no permitido' });

  const { metodo } = req.body;
  if (!metodo || !['LLAMADA', 'WHATSAPP'].includes(metodo)) {
    return res.status(400).json({ error: 'metodo debe ser LLAMADA o WHATSAPP' });
  }

  // Verificar que el prospecto existe y el usuario tiene acceso
  const prospecto = await prisma.prospecto.findUnique({ where: { id } });
  if (!prospecto) return res.status(404).json({ error: 'No encontrado' });

  if (session.role !== 'admin' && prospecto.asignadoA !== session.userId) {
    return res.status(403).json({ error: 'Sin acceso' });
  }

  const updated = await prisma.prospecto.update({
    where: { id },
    data: {
      metodoContacto: metodo,
      totalContactos: { increment: 1 },
      ultimoContacto: new Date(),
    },
    include: {
      asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
    },
  });

  return res.status(200).json({ prospecto: updated });
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npm run build 2>&1 | head -30
```

No debe haber errores de TypeScript.

- [ ] **Step 3: Probar manualmente con curl (con dev server corriendo)**

```bash
# Primero obtener un ID de prospecto real desde la DB o la UI
curl -X PATCH http://localhost:3000/api/prospects/PROSPECTO_ID/contactar \
  -H "Content-Type: application/json" \
  -d '{"metodo":"LLAMADA"}' \
  -b "crm-session=TU_COOKIE"
```

Esperado: `{"prospecto": {..., "totalContactos": 1, "metodoContacto": "LLAMADA", "ultimoContacto": "..."}}`

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/prospects/
git commit -m "feat: add contactar endpoint for prospects"
```

---

## Task 3: API — Permitir a usuarios editar observacionesInternas

**Files:**
- Modify: `src/pages/api/prospects/[id].ts`

- [ ] **Step 1: Actualizar el PATCH handler**

Reemplazar el bloque del método PATCH en `src/pages/api/prospects/[id].ts`:

```typescript
  if (req.method === 'PATCH') {
    const { asignadoA, observacionesInternas } = req.body;

    // Solo admin puede asignar
    if (asignadoA !== undefined && session.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden asignar' });
    }

    // Solo admin o el agente asignado pueden editar observaciones
    const prospecto = await prisma.prospecto.findUnique({ where: { id } });
    if (!prospecto) return res.status(404).json({ error: 'No encontrado' });

    if (
      observacionesInternas !== undefined &&
      session.role !== 'admin' &&
      prospecto.asignadoA !== session.userId
    ) {
      return res.status(403).json({ error: 'Sin acceso' });
    }

    const data: Record<string, unknown> = {};
    if (asignadoA !== undefined) data.asignadoA = asignadoA || null;
    if (observacionesInternas !== undefined) data.observacionesInternas = observacionesInternas;

    const updated = await prisma.prospecto.update({
      where: { id },
      data,
      include: {
        asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
      },
    });

    return res.status(200).json({ prospecto: updated });
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/api/prospects/[id].ts
git commit -m "feat: allow assigned agent to edit observacionesInternas"
```

---

## Task 4: API — Endpoint de stats de prospectos para Dashboard

**Files:**
- Create: `src/pages/api/prospects/stats.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  if (session.role === 'admin') {
    // Traer todos los prospectos con su asignado
    const prospectos = await prisma.prospecto.findMany({
      select: {
        asignadoA: true,
        ultimoContacto: true,
        asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
      },
    });

    // Agrupar por agente
    const map = new Map<string, {
      userId: string;
      nombre: string | null;
      apellidos: string | null;
      email: string;
      totalProspectos: number;
      contactadosHoy: number;
      conAlerta: number;
    }>();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const p of prospectos) {
      if (!p.asignadoA || !p.asignado) continue;
      const uid = p.asignadoA;
      if (!map.has(uid)) {
        map.set(uid, {
          userId: uid,
          nombre: p.asignado.nombre,
          apellidos: p.asignado.apellidos,
          email: p.asignado.email,
          totalProspectos: 0,
          contactadosHoy: 0,
          conAlerta: 0,
        });
      }
      const entry = map.get(uid)!;
      entry.totalProspectos++;

      const uc = p.ultimoContacto;
      if (uc && uc >= todayStart) entry.contactadosHoy++;
      if (!uc || uc < twoDaysAgo) entry.conAlerta++;
    }

    return res.status(200).json({ stats: Array.from(map.values()) });
  } else {
    // Solo stats del propio usuario
    const [total, conAlerta, contactadosHoy] = await Promise.all([
      prisma.prospecto.count({ where: { asignadoA: session.userId } }),
      prisma.prospecto.count({
        where: {
          asignadoA: session.userId,
          OR: [
            { ultimoContacto: null },
            { ultimoContacto: { lt: twoDaysAgo } },
          ],
        },
      }),
      prisma.prospecto.count({
        where: {
          asignadoA: session.userId,
          ultimoContacto: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return res.status(200).json({
      stats: [{
        userId: session.userId,
        nombre: null,
        apellidos: null,
        email: '',
        totalProspectos: total,
        contactadosHoy,
        conAlerta,
      }],
    });
  }
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/prospects/stats.ts
git commit -m "feat: add prospect stats endpoint for dashboard"
```

---

## Task 5: Fix — Botón Asignar no visible en producción

**Files:**
- Modify: `src/lib/session.ts` (si aplica)

- [ ] **Step 1: Diagnosticar**

El botón Asignar en `src/pages/prospects/index.tsx` se muestra cuando `session.role === 'admin'`. La session viene de `/api/auth/me`. Verificar que en producción `NEXT_PUBLIC_URL` empieza con `https://`.

En Railway/Vercel: ir a las variables de entorno y confirmar que `NEXT_PUBLIC_URL=https://tu-dominio.com` (con `https`, no `http`).

Si `NEXT_PUBLIC_URL` empieza con `http://` en producción, la cookie se crea con `secure: false` en local pero el servidor de producción Railway puede estar detrás de un proxy HTTPS. En ese caso la cookie sí se crea pero el problema sería otro.

- [ ] **Step 2: Agregar logging temporal en `/api/auth/me`**

Localizar `src/pages/api/auth/me.ts` y agregar un log para confirmar qué devuelve en producción:

```typescript
// Agregar justo antes del return exitoso:
console.log('[auth/me] session:', { userId: session.userId, role: session.role, email: session.email });
```

Deploy a producción, iniciar sesión como admin y revisar los logs de Railway. Si `role` no aparece como `"admin"`, el problema está en el login (`src/pages/api/auth/login.ts`) — verificar que guarda `role` en la sesión.

- [ ] **Step 3: Verificar login.ts**

Abrir `src/pages/api/auth/login.ts` y confirmar que al guardar la sesión incluye el role:

```typescript
session.role = user.role; // debe estar presente
await session.save();
```

Si falta `session.role = user.role`, agregarlo.

- [ ] **Step 4: Quitar el log temporal, commit fix**

```bash
git add src/pages/api/auth/
git commit -m "fix: ensure role is saved in session on login"
```

---

## Task 6: UI — Rediseño página de Prospectos

**Files:**
- Modify: `src/pages/prospects/index.tsx`

Este es el task más grande. Se reescribe el archivo completo.

- [ ] **Step 1: Actualizar el tipo `Prospecto` en el frontend**

En la interface `Prospecto` del archivo, agregar los nuevos campos:

```typescript
  metodoContacto: string | null;
  totalContactos: number;
  ultimoContacto: string | null;
```

- [ ] **Step 2: Agregar helper para detectar alerta**

Agregar esta función al componente:

```typescript
function tieneAlerta(p: Prospecto): boolean {
  if (!p.ultimoContacto) return true;
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  return new Date(p.ultimoContacto) < twoDaysAgo;
}

function diasSinContacto(p: Prospecto): number {
  if (!p.ultimoContacto) return Infinity;
  const diff = Date.now() - new Date(p.ultimoContacto).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
```

- [ ] **Step 3: Agregar estado y función para registrar contacto**

```typescript
const [contactLoading, setContactLoading] = useState<string | null>(null); // id del prospecto en proceso

async function handleContactar(prospecto: Prospecto, metodo: 'LLAMADA' | 'WHATSAPP') {
  setContactLoading(prospecto.id);
  try {
    const res = await fetch(`/api/prospects/${prospecto.id}/contactar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metodo }),
    });
    if (!res.ok) throw new Error('Error al registrar');
    toast.success(`Contacto por ${metodo === 'LLAMADA' ? 'llamada' : 'WhatsApp'} registrado`);
    fetchProspectos(currentPage);
  } catch {
    toast.error('Error al registrar contacto');
  } finally {
    setContactLoading(null);
  }
}
```

- [ ] **Step 4: Actualizar los imports**

```typescript
import { Search, ChevronLeft, ChevronRight, UserCheck, Eye, Phone, MessageCircle, AlertTriangle, Copy, Check } from 'lucide-react';
```

- [ ] **Step 5: Agregar estado para botón de copia**

```typescript
const [copiedField, setCopiedField] = useState<string | null>(null);

function copyToClipboard(value: string, key: string) {
  navigator.clipboard.writeText(value);
  setCopiedField(key);
  setTimeout(() => setCopiedField(null), 2000);
}
```

- [ ] **Step 6: Actualizar columnas de la tabla**

Reemplazar el `<TableHeader>` con:

```tsx
<TableHeader>
  <TableRow>
    <TableHead>Cliente</TableHead>
    <TableHead>N° Orden</TableHead>
    <TableHead>Teléfono</TableHead>
    <TableHead>Estado</TableHead>
    <TableHead>Contactos</TableHead>
    {session.role === 'admin' && <TableHead>Asignado a</TableHead>}
    <TableHead className="w-32">Acciones</TableHead>
  </TableRow>
</TableHeader>
```

- [ ] **Step 7: Actualizar filas de la tabla**

Reemplazar el contenido de cada `<TableRow>` dentro del map:

```tsx
<TableRow key={p.id} className={tieneAlerta(p) && p.asignadoA ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
  <TableCell className="font-medium">
    <div>{p.cliente || '—'}</div>
    <div className="text-xs text-muted-foreground">{p.idCliente || ''}</div>
  </TableCell>
  <TableCell className="text-sm">{p.nroOrden}</TableCell>
  <TableCell className="text-sm">{p.telCelular || p.telInstalacion || p.telOficina || '—'}</TableCell>
  <TableCell>
    <Badge variant={estadoBadgeVariant(p.estado)}>
      {p.estado || '—'}
    </Badge>
  </TableCell>
  <TableCell>
    <div className="flex items-center gap-1.5">
      {p.metodoContacto === 'LLAMADA' && <Phone className="h-3.5 w-3.5 text-blue-500" />}
      {p.metodoContacto === 'WHATSAPP' && <MessageCircle className="h-3.5 w-3.5 text-green-500" />}
      {!p.metodoContacto && <Phone className="h-3.5 w-3.5 text-muted-foreground/40" />}
      <span className="text-sm">{p.totalContactos}</span>
      {tieneAlerta(p) && p.asignadoA && (
        <Badge variant="destructive" className="text-xs px-1 py-0 h-5">
          <AlertTriangle className="h-3 w-3 mr-0.5" />
          {p.ultimoContacto ? `${diasSinContacto(p)}d` : 'Nunca'}
        </Badge>
      )}
    </div>
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
      <Button variant="ghost" size="sm" onClick={() => setViewingProspecto(p)} title="Ver detalle">
        <Eye className="h-4 w-4" />
      </Button>
      {session.role !== 'admin' && p.asignadoA === session.userId && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleContactar(p, 'LLAMADA')}
            disabled={contactLoading === p.id}
            title="Registrar llamada"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleContactar(p, 'WHATSAPP')}
            disabled={contactLoading === p.id}
            title="Registrar WhatsApp"
            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </>
      )}
      {session.role === 'admin' && (
        <Button variant="ghost" size="sm" onClick={() => openAssign(p)} title="Asignar">
          <UserCheck className="h-4 w-4" />
        </Button>
      )}
    </div>
  </TableCell>
</TableRow>
```

- [ ] **Step 8: Rediseñar el Dialog de Detalle**

Reemplazar el contenido del Dialog de detalle (`viewingProspecto`) con el nuevo diseño en secciones:

```tsx
{viewingProspecto && (
  <Dialog open onOpenChange={() => setViewingProspecto(null)}>
    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-lg">
          {viewingProspecto.cliente || 'Prospecto sin nombre'}
        </DialogTitle>
      </DialogHeader>

      {/* Banner de alerta */}
      {tieneAlerta(viewingProspecto) && viewingProspecto.asignadoA && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            {viewingProspecto.ultimoContacto
              ? `Sin contacto hace ${diasSinContacto(viewingProspecto)} día${diasSinContacto(viewingProspecto) !== 1 ? 's' : ''}`
              : 'Nunca ha sido contactado'}
            {viewingProspecto.metodoContacto && ` — último: ${viewingProspecto.metodoContacto}`}
          </span>
        </div>
      )}

      <div className="space-y-5 text-sm">
        {/* Sección: Cliente */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Cliente</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground">Nombre</p>
              <p className="font-medium">{viewingProspecto.cliente || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">ID / Cédula</p>
              <p className="font-medium">{viewingProspecto.idCliente || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Estado</p>
              <Badge variant={estadoBadgeVariant(viewingProspecto.estado)}>{viewingProspecto.estado || '—'}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Prioridad</p>
              <p className="font-medium">{viewingProspecto.prioridad || '—'}</p>
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* Sección: Contacto */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Contacto</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              ['Tel. Celular', viewingProspecto.telCelular, 'telCelular'],
              ['Tel. Instalación', viewingProspecto.telInstalacion, 'telInstalacion'],
              ['Tel. Oficina', viewingProspecto.telOficina, 'telOficina'],
              ['Email', viewingProspecto.email, 'email'],
            ] as [string, string | null, string][]).map(([label, value, key]) => (
              <div key={key} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-muted-foreground">{label}</p>
                  <p className="font-medium truncate">{value || '—'}</p>
                </div>
                {value && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 flex-shrink-0 mt-4"
                    onClick={() => copyToClipboard(value, key)}
                    title="Copiar"
                  >
                    {copiedField === key
                      ? <Check className="h-3.5 w-3.5 text-green-500" />
                      : <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    }
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <hr className="border-border" />

        {/* Sección: Ubicación */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ubicación</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground">Provincia</p>
              <p className="font-medium">{viewingProspecto.provincia || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cantón</p>
              <p className="font-medium">{viewingProspecto.canton || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Distrito</p>
              <p className="font-medium">{viewingProspecto.distrito || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Dirección</p>
              <p className="font-medium">{viewingProspecto.direccion || '—'}</p>
            </div>
            {(viewingProspecto.latitud || viewingProspecto.longitud) && (
              <div className="col-span-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-muted-foreground">Coordenadas</p>
                  <p className="font-medium font-mono text-xs">
                    {viewingProspecto.latitud}, {viewingProspecto.longitud}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 flex-shrink-0 mt-4"
                  onClick={() => copyToClipboard(`${viewingProspecto.latitud},${viewingProspecto.longitud}`, 'coords')}
                  title="Copiar coordenadas"
                >
                  {copiedField === 'coords'
                    ? <Check className="h-3.5 w-3.5 text-green-500" />
                    : <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                </Button>
              </div>
            )}
          </div>
        </div>

        <hr className="border-border" />

        {/* Sección: Gestión */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Gestión</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground">Asignado a</p>
              <p className="font-medium">{viewingProspecto.asignado ? nombreUsuario(viewingProspecto.asignado) : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total contactos</p>
              <p className="font-medium">{viewingProspecto.totalContactos}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Último contacto</p>
              <p className="font-medium">
                {viewingProspecto.ultimoContacto
                  ? new Date(viewingProspecto.ultimoContacto).toLocaleString('es-CR')
                  : '—'}
                {viewingProspecto.metodoContacto && (
                  <span className="ml-1 text-muted-foreground">({viewingProspecto.metodoContacto})</span>
                )}
              </p>
            </div>
            {viewingProspecto.observacionesInternas && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Observaciones internas</p>
                <p className="font-medium">{viewingProspecto.observacionesInternas}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
)}
```

- [ ] **Step 9: Verificar en dev server que la página carga sin errores**

```bash
npm run dev
```

Navegar a `http://localhost:3000/prospects`. Verificar:
- Tabla carga correctamente
- Columna "Contactos" visible
- Para un usuario (no admin): botones 📞 y 💬 visibles por fila asignada
- Para admin: botón UserCheck visible (fix del bug)
- Dialog de detalle muestra secciones organizadas con botones de copia

- [ ] **Step 10: Commit**

```bash
git add src/pages/prospects/index.tsx
git commit -m "feat: redesign prospects page with contact tracking UI"
```

---

## Task 7: UI — Dashboard con datos de prospectos

**Files:**
- Modify: `src/pages/index.tsx`

- [ ] **Step 1: Agregar tipos e interfaces para prospectos**

En `src/pages/index.tsx`, agregar estas interfaces:

```typescript
interface ProspectStat {
  userId: string;
  nombre: string | null;
  apellidos: string | null;
  email: string;
  totalProspectos: number;
  contactadosHoy: number;
  conAlerta: number;
}
```

- [ ] **Step 2: Agregar estado de stats de prospectos**

```typescript
const [prospectStats, setProspectStats] = useState<ProspectStat[]>([]);
const [myProspectStat, setMyProspectStat] = useState<ProspectStat | null>(null);
```

- [ ] **Step 3: Cargar stats de prospectos en loadDashboardData**

Al final de la función `loadDashboardData`, antes del `catch`, agregar:

```typescript
      // ── Prospectos ────────────────────────────────────────
      const prospectsRes = await fetch('/api/prospects/stats');
      if (prospectsRes.ok) {
        const prospectsData = await prospectsRes.json();
        const statsArr: ProspectStat[] = prospectsData.stats || [];
        if (activeUser.role === 'admin') {
          setProspectStats(statsArr);
        } else {
          setMyProspectStat(statsArr[0] || null);
        }
      }
```

- [ ] **Step 4: Agregar tarjetas de prospectos en la fila de métricas**

En la sección `{/* Métricas Principales */}`, cambiar el grid de 4 columnas a 6 y agregar 2 tarjetas nuevas después de las existentes:

Cambiar `grid-cols-2 lg:grid-cols-4` a `grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`.

Luego agregar al final de la sección de métricas, dentro del mismo grid:

```tsx
          {/* Tarjetas de prospectos */}
          {(user?.role === 'admin' ? prospectStats.length >= 0 : myProspectStat !== null) && (() => {
            const total = user?.role === 'admin'
              ? prospectStats.reduce((s, p) => s + p.totalProspectos, 0)
              : myProspectStat?.totalProspectos ?? 0;
            const conAlerta = user?.role === 'admin'
              ? prospectStats.reduce((s, p) => s + p.conAlerta, 0)
              : myProspectStat?.conAlerta ?? 0;

            return (
              <>
                <Card className="shadow-sm border-t-4 border-t-indigo-500 hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Prospectos</CardTitle>
                    <div className="hidden sm:flex p-2 bg-indigo-500/10 rounded-lg">
                      <UserCircle className="h-4 w-4 text-indigo-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold">{total}</div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {user?.role === 'admin' ? 'Total asignados' : 'Asignados a ti'}
                    </p>
                  </CardContent>
                </Card>

                <Card className={cn(
                  "shadow-sm border-t-4 hover:shadow-md transition-shadow",
                  conAlerta > 0 ? "border-t-red-500" : "border-t-gray-300"
                )}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Con alerta</CardTitle>
                    <div className={cn(
                      "hidden sm:flex p-2 rounded-lg",
                      conAlerta > 0 ? "bg-red-500/10" : "bg-muted"
                    )}>
                      <AlertCircle className={cn("h-4 w-4", conAlerta > 0 ? "text-red-500" : "text-muted-foreground")} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={cn(
                      "text-2xl sm:text-3xl font-bold",
                      conAlerta > 0 ? "text-red-600" : "text-foreground"
                    )}>
                      {conAlerta}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {conAlerta > 0 ? 'Más de 2 días sin contacto' : 'Todo al día'}
                    </p>
                  </CardContent>
                </Card>
              </>
            );
          })()}
```

- [ ] **Step 5: Agregar card "Contactación de Prospectos" (solo admin)**

Agregar esta Card después del bloque `{/* Sección Inferior: KPIs y Análisis */}` y antes de `{/* Nóminas */}`:

```tsx
        {/* Contactación de Prospectos — solo admin */}
        {user?.role === 'admin' && prospectStats.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Contactación de Prospectos
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/prospects')}
                  className="text-xs h-7 px-2 gap-1"
                >
                  Ver prospectos <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <CardDescription>Actividad de contactación por agente · hoy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {prospectStats.map((stat) => {
                  const alertPct = stat.totalProspectos > 0
                    ? stat.conAlerta / stat.totalProspectos
                    : 0;
                  const rowBg = alertPct >= 0.6
                    ? 'bg-red-50 dark:bg-red-950/20'
                    : alertPct >= 0.3
                    ? 'bg-yellow-50 dark:bg-yellow-950/20'
                    : '';
                  const contactPct = stat.totalProspectos > 0
                    ? Math.round((stat.contactadosHoy / stat.totalProspectos) * 100)
                    : 0;
                  const displayName = stat.nombre && stat.apellidos
                    ? `${stat.nombre} ${stat.apellidos}`
                    : stat.email;
                  return (
                    <div key={stat.userId} className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                      rowBg || 'bg-muted/30'
                    )}>
                      <UserCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium w-32 truncate flex-shrink-0">{displayName}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{stat.contactadosHoy}/{stat.totalProspectos} hoy</span>
                          <span className="text-xs font-medium">{contactPct}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
                            style={{ width: `${contactPct}%` }}
                          />
                        </div>
                      </div>
                      {stat.conAlerta > 0 && (
                        <div className="flex items-center gap-1 text-xs text-red-600 flex-shrink-0">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>{stat.conAlerta}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
```

- [ ] **Step 6: Agregar mini-widget de prospectos para usuarios (no admin)**

Dentro de la sección de KPI de Cumplimiento de usuario (vista usuario), dentro del `else` que muestra el ring chart, agregar después del div principal del ring chart un bloque con sus stats de prospectos:

```tsx
                    {myProspectStat && (
                      <div className="mt-4 pt-4 border-t space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Mis Prospectos</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total asignados</span>
                          <span className="text-xl font-bold">{myProspectStat.totalProspectos}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Con alerta</span>
                          <span className={cn(
                            "text-xl font-bold",
                            myProspectStat.conAlerta > 0 ? "text-red-600" : "text-green-600"
                          )}>
                            {myProspectStat.conAlerta}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                          {myProspectStat.conAlerta === 0
                            ? '¡Todo al día con tus prospectos!'
                            : `${myProspectStat.conAlerta} prospecto${myProspectStat.conAlerta !== 1 ? 's' : ''} sin contacto en más de 2 días`}
                        </div>
                      </div>
                    )}
```

- [ ] **Step 7: Verificar en dev server**

```bash
npm run dev
```

Navegar a `http://localhost:3000`. Verificar:
- 6 tarjetas de métricas en desktop (o 2 columnas en mobile)
- Admin: card "Contactación de Prospectos" visible con tabla de agentes
- Usuario: sección de prospectos visible dentro del KPI card

- [ ] **Step 8: Commit**

```bash
git add src/pages/index.tsx
git commit -m "feat: add prospect stats to dashboard"
```

---

## Task 8: Build y verificación final

- [ ] **Step 1: Build completo**

```bash
npm run build
```

Esperado: sin errores de TypeScript ni de compilación.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Corregir cualquier warning/error antes de continuar.

- [ ] **Step 3: Commit final si hay correcciones**

```bash
git add -A
git commit -m "fix: address lint and build issues"
```

- [ ] **Step 4: Verificar el fix del botón Asignar en producción**

Después de deploy, revisar los logs en Railway para confirmar que `/api/auth/me` retorna `role: "admin"` correctamente. Si el botón sigue sin aparecer, revisar `src/pages/api/auth/login.ts` y confirmar que guarda `session.role = user.role` antes de `session.save()`.
