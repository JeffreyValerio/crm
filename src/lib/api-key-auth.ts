import { createHash, randomBytes } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from './prisma';

export function hashApiKey(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}

export function generateApiKey(): string {
  return randomBytes(32).toString('hex');
}

// ── Rate limiter en memoria ───────────────────────────────────────────────────
// 300 requests por key por minuto. En serverless cada instancia tiene su propio
// contador, lo que da protección por instancia (suficiente para Power BI).
const RATE_LIMIT = 300;
const WINDOW_MS  = 60_000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(keyHash: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(keyHash);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(keyHash, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── Validación de fechas ──────────────────────────────────────────────────────
export function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function parseDateParam(
  value: unknown,
  res: NextApiResponse,
  paramName: string
): Date | 'error' | null {
  if (!value) return null;
  const d = parseDate(value);
  if (d === null) {
    res.status(400).json({ error: `Parámetro '${paramName}' no es una fecha válida (use YYYY-MM-DD).` });
    return 'error';
  }
  return d;
}

// ── Auth + rate limit ─────────────────────────────────────────────────────────
export async function validateApiKey(req: NextApiRequest): Promise<string | null> {
  const header = req.headers['x-api-key'];
  if (!header || typeof header !== 'string') return null;
  const hash = hashApiKey(header);
  const found = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
  return found ? hash : null;
}

export function withApiKeyAuth(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const keyHash = await validateApiKey(req);
    if (!keyHash) {
      return res.status(401).json({ error: 'API key inválida o ausente. Envíala en el header X-API-Key.' });
    }

    if (!checkRateLimit(keyHash)) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'Límite de peticiones alcanzado. Intenta de nuevo en 60 segundos.' });
    }

    // Actualizar uso en background (no bloquea la respuesta)
    prisma.apiKey.update({
      where: { keyHash },
      data: { lastUsedAt: new Date(), totalRequests: { increment: 1 } },
    }).catch(() => { /* silencioso — no afecta la respuesta */ });

    return handler(req, res);
  };
}
