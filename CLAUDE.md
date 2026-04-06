# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Generate Prisma client + Next.js production build
npm run lint         # ESLint via next lint

npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:push      # Sync schema to database (no migration history)
npm run db:migrate   # Create and run a new Prisma migration
npm run db:seed      # Seed initial data (creates admin@admin.com / admin)
```

Local PostgreSQL runs via Docker Compose on port 5432.

## Architecture

**Framework:** Next.js (Pages Router) + React 19 + TypeScript. No App Router — all pages are under `src/pages/`.

**Database:** PostgreSQL via Prisma ORM with the `@prisma/adapter-pg` driver (pool-based). The generated Prisma client lives at `src/generated/prisma/` (not the default location). Always import it from `src/lib/prisma.ts`, which handles the global singleton and SSL configuration.

**Auth:** Session-based via `iron-session` with encrypted cookies (`crm-session`). The `secure` cookie flag is set based on whether `NEXT_PUBLIC_URL` starts with `https`. Session stores `{ userId, email, role }`. Helper: `src/lib/session.ts`.

**API routes** (`src/pages/api/`):
- `auth/` — login, logout, me
- `clients/` — CRUD, image upload/delete (Cloudinary via formidable)
- `payroll/` — list/create, approve, update days worked, send email receipt
- `advances/` — list/create, approve, reject
- `users/` — list, update, invite (email via Nodemailer)
- `invite/` — verify token, accept invitation
- `setup/` — check if any users exist, initialize first admin
- `geo/provinces` — Costa Rica province/canton/district data
- `product-types/`, `plans/` — catalog management

**Setup flow:** On first visit with no users in the DB, the app redirects to `/setup`. Checked at `_app.tsx` level and via `api/setup/check`.

**Client model** is the core entity. It has:
- Photos stored on Cloudinary (`cedulaFrontalUrl`, `cedulaTraseraUrl`, `selfieUrl`)
- Two independent status flows: `validationStatus` (EN_PROCESO_VALIDACION → APROBADA / REQUIERE_DEPOSITO / NO_APLICA / INCOBRABLE / DEUDA_MENOR_ANIO) and `saleStatus` (PENDIENTE_INSTALACION → INSTALADA / CANCELADA)
- `StatusComment` records every status change with previous/new state and a required comment

**Payroll** is bi-weekly (`quincena` = 1 or 2, `periodo` = "YYYY-MM"). Workflow: PENDIENTE → APROBADO → PAGADO. Admin can edit `diasTrabajados`. PDF receipts generated with jsPDF (`src/lib/payroll-pdf.ts`) and emailed via Nodemailer (`src/lib/mail.ts`). BCC to `cvalerioa24@gmail.com` on every payroll email.

**Advances** track salary advances with installment repayment across multiple `quincenas`. Workflow: PENDIENTE → APROBADO / RECHAZADO → EN_COBRO → COMPLETADO.

## UI Component System

Custom-built system at `src/components/ui/` inspired by shadcn/ui patterns (CVA variants, compound components). **Not** Radix-based — Dialog and Select are custom implementations.

Key components:
- `button.tsx` — CVA variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- `badge.tsx` — CVA variants: `default`, `success`, `warning`, `destructive`, `info`, `pending` — use for all status indicators
- `dialog.tsx` — Custom modal with focus trap, ESC to close, `aria-modal`, and `aria-labelledby`. Default width is `max-w-2xl`; override via `className` on `DialogContent` (e.g. `max-w-5xl` for complex forms)
- `table-empty-state.tsx` — Use inside `TableBody` for empty tables; renders its own `TableRow`
- `table-skeleton.tsx` — Page-level loading state for table pages; accepts `cols`, `rows`, `showFilters`
- `skeleton.tsx` — Pulsing primitive for custom skeleton layouts

**Color tokens** (CSS variables in `src/styles/globals.css`): HSL-based, semantic. Dark mode via `next-themes` with `class` strategy. `accent` is intentionally slightly different from `secondary` — used for hover states throughout.

**Sidebar** (`src/components/layout/sidebar.tsx`): Collapsible, state persisted in `localStorage`. Uses `text-foreground` (not `text-white`) so it works in both light and dark mode.

## Environment Variables

Required in `.env`:
```
DATABASE_URL=          # PostgreSQL connection string
DATABASE_SSL=          # "true" to force SSL (or embed sslmode= in DATABASE_URL)
SESSION_SECRET=        # At least 32 characters
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
NEXT_PUBLIC_URL=       # Full URL; controls secure cookie flag (must start with https in prod)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Key Conventions

- Spanish is used for all domain model field names, UI text, and comments.
- Roles are plain strings (`"admin"` / `"user"`), not an enum.
- All monetary values are stored as `Decimal` in colones (CRC).
- The Prisma client is imported from `@/generated/prisma/client` via the singleton in `src/lib/prisma.ts` — never directly from `@prisma/client`.
- Status badges always use the `Badge` component with semantic variants, never hardcoded Tailwind color classes.
- Page-level loading states use `TableSkeleton` inside `MainLayout`, not plain text or a bare spinner.

## Approach
- Think before acting. Read existing files before writing code.
- Be concise in output but thorough in reasoning.
- Prefer editing over rewriting whole files.
- Do not re-read files you have already read unless the file may have changed.
- Test your code before declaring done.
- No sycophantic openers or closing fluff.
- Keep solutions simple and direct.
- User instructions always override this file.