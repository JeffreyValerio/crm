import { createHash, randomBytes } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from './prisma';

export function hashApiKey(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}

export function generateApiKey(): string {
  return randomBytes(32).toString('hex');
}

export async function validateApiKey(req: NextApiRequest): Promise<boolean> {
  const header = req.headers['x-api-key'];
  if (!header || typeof header !== 'string') return false;
  const hash = hashApiKey(header);
  const found = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
  return found !== null;
}

export function withApiKeyAuth(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Método no permitido' });
    }
    const valid = await validateApiKey(req);
    if (!valid) {
      return res.status(401).json({ error: 'API key inválida o ausente. Envíala en el header X-API-Key.' });
    }
    return handler(req, res);
  };
}
