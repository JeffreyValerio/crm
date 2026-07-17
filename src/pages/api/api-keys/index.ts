import type { NextApiRequest, NextApiResponse } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { generateApiKey, hashApiKey } from '@/lib/api-key-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  if (!session.userId || session.role !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores' });
  }

  if (req.method === 'GET') {
    const keys = await prisma.apiKey.findMany({
      select: { id: true, label: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ keys });
  }

  if (req.method === 'POST') {
    const { label } = req.body;
    const plain = generateApiKey();
    const keyHash = hashApiKey(plain);
    const created = await prisma.apiKey.create({
      data: { keyHash, label: label || 'Power BI' },
      select: { id: true, label: true, createdAt: true },
    });
    // plain se devuelve una sola vez
    return res.status(201).json({ ...created, plain });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
