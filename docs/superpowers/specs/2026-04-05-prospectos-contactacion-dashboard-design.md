# Diseño: Prospectos — Contactación, Detalle Mejorado y Dashboard

**Fecha:** 2026-04-05  
**Estado:** Aprobado

---

## Resumen

Mejoras al módulo de Prospectos para soportar el flujo real de trabajo: los agentes llaman o escriben por WhatsApp a prospectos para convertirlos en clientes. El sistema debe registrar cada contacto (método + fecha), alertar si un prospecto lleva >2 días sin contacto, mostrar la información del prospecto de forma organizada con botones de copia, y reflejar todo esto en el Dashboard.

También se corrige el bug del botón "Asignar" que no aparece en producción para el admin.

---

## 1. Base de datos

### Campos nuevos en `Prospecto`

```prisma
metodoContacto   String?   // "LLAMADA" | "WHATSAPP" — último método usado
totalContactos   Int       @default(0)
ultimoContacto   DateTime?
```

### Migración
- `db:migrate` con nombre `add_contactacion_to_prospecto`
- Los registros existentes quedan con `totalContactos = 0`, `ultimoContacto = null`, `metodoContacto = null`

---

## 2. API

### Endpoint nuevo: `PATCH /api/prospects/[id]/contactar`

**Acceso:** Agente asignado (`asignadoA === session.userId`) o admin.  
**Body:** `{ metodo: "LLAMADA" | "WHATSAPP" }`  
**Acción:**
- Incrementa `totalContactos += 1`
- Actualiza `ultimoContacto = new Date()`
- Actualiza `metodoContacto = metodo`

**Respuesta:** `{ prospecto }` con los campos actualizados.

### Endpoint existente: `PATCH /api/prospects/[id]`
- **Asignar** (`asignadoA`): solo admin.
- **Observaciones internas** (`observacionesInternas`): admin y el agente asignado al prospecto.

### Endpoint existente: `GET /api/prospects`
Retorna los campos nuevos en el objeto `Prospecto`.

### Endpoint nuevo: `GET /api/prospects/stats`
Usado por el Dashboard.  
**Acceso:** Cualquier usuario autenticado.  
**Comportamiento:**
- Admin: devuelve stats agrupadas por agente (`asignadoA`)
- Usuario: devuelve solo sus propios stats

**Respuesta:**
```json
{
  "stats": [
    {
      "userId": "...",
      "nombre": "...",
      "apellidos": "...",
      "email": "...",
      "totalProspectos": 12,
      "contactadosHoy": 3,
      "conAlerta": 4
    }
  ]
}
```

`conAlerta` = prospectos donde `ultimoContacto` es null o `ultimoContacto < now() - 2 días`.

---

## 3. Página de Prospectos (`/prospects`)

### Tabla (lista)

**Columnas actualizadas:**
| Cliente | N° Orden | Teléfono | Despacho | Tipo Orden | Estado | Contactos | Asignado a* | Acciones |

**Columna "Contactos":**
- Ícono del último método (teléfono para LLAMADA, mensaje para WHATSAPP) o ícono neutro si nunca contactado
- Número de contactos realizados
- Badge de alerta roja `⚠ X días` si `ultimoContacto` es null o > 2 días

**Acciones por fila:**
- Botón `👁 Ver` — abre el detalle (todos)
- Botones `📞` y `💬` — registran contacto directamente (solo agente asignado; admin no los ve)
- Botón `UserCheck` — asignar (solo admin)

### Dialog de Detalle (rediseñado)

**Estructura en secciones con separadores:**

**Banner de alerta** (visible si >2 días sin contacto):
> ⚠ Sin contacto hace X días — última vez: [fecha] por [LLAMADA/WHATSAPP]

**Sección: Cliente**
- Nombre completo, ID Cliente (cédula), Estado (badge), Prioridad (badge)

**Sección: Contacto** — cada campo tiene botón `Copiar`
- Tel. Celular, Tel. Instalación, Tel. Oficina, Email

**Sección: Ubicación** — coords con botón `Copiar`
- Provincia, Cantón, Distrito, Dirección, Latitud + Longitud

**Sección: Gestión interna**
- Asignado a, Total contactos, Último contacto (fecha + método), Observaciones internas

---

## 4. Dashboard (`/`)

### Tarjetas de métricas (fila superior)

Se agregan 2 tarjetas nuevas a la fila existente (de 4 a 6 columnas en desktop, 2 columnas en mobile):

| Tarjeta | Valor | Color |
|---|---|---|
| Prospectos asignados | Total prospectos del usuario | Azul índigo |
| Prospectos con alerta | Prospectos >2 días sin contacto | Rojo si > 0, gris si 0 |

**Nota para usuarios no-admin:** Solo ven sus propios números.  
**Nota para admin con filtro de vendedor activo:** Las tarjetas de prospectos muestran el total del vendedor filtrado.

### Card nueva: "Contactación de Prospectos" (solo admin)

Ubicada debajo de la sección de KPI de Cumplimiento, antes de Nóminas.

**Contenido:** Tabla/grid con una fila por agente:
- Nombre
- Total prospectos
- Contactados hoy
- Con alerta (número en rojo badge si > 0)
- Barra de progreso visual: `contactadosHoy / totalProspectos`

**Resaltado:** Si un agente tiene ≥ 30% de sus prospectos con alerta, la fila tiene fondo `bg-yellow-50 dark:bg-yellow-950/20`. Si ≥ 60%, fondo rojo suave.

### Widget de prospectos para usuario (vista propia)

En la sección inferior del dashboard, junto al KPI de cumplimiento actual, se agrega un mini-resumen:
- Total prospectos asignados
- Con alerta: badge rojo si hay alguno, con texto motivacional si no hay ninguno

---

## 5. Bug fix: Botón "Asignar" no visible en producción

**Síntoma:** Admin en producción no ve el botón de asignar prospectos, solo en localhost.

**Causa probable:** El `session.role` no está siendo leído correctamente desde la cookie en producción. Puede deberse a:
1. La cookie `crm-session` no se envía por diferencia en el dominio/path
2. `SESSION_SECRET` diferente entre instancias (si hay múltiples pods/deploys)
3. El cookie `secure` flag requiere HTTPS y la URL de producción no está configurada con `NEXT_PUBLIC_URL=https://...`

**Plan de investigación y fix:**
- Verificar que `NEXT_PUBLIC_URL` en producción empiece con `https://`
- Verificar que `SESSION_SECRET` sea consistente en el entorno de producción
- Agregar logging temporal en `/api/auth/me` para confirmar qué retorna en producción
- Si el issue es el flag `secure`, confirmar que Railway/Vercel sirve sobre HTTPS y la variable está correcta

---

## 6. Archivos a modificar

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | Agregar 3 campos a `Prospecto` |
| `src/pages/api/prospects/index.ts` | Retornar campos nuevos |
| `src/pages/api/prospects/[id].ts` | Sin cambios lógicos |
| `src/pages/api/prospects/[id]/contactar.ts` | Nuevo endpoint |
| `src/pages/api/prospects/stats.ts` | Nuevo endpoint de stats |
| `src/pages/prospects/index.tsx` | Rediseño completo: botones contacto, tabla, dialog detalle |
| `src/pages/index.tsx` | Nuevas tarjetas + card de contactación |

---

## 7. Fuera de alcance

- Historial completo de contactaciones (se decidió usar contador simple)
- Notificaciones push/email por alertas de baja contactación
- El admin registrar contactos (solo agentes asignados)
