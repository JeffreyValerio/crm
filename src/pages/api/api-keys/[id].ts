import type { NextApiRequest, NextApiResponse } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  if (!session.userId || (session.role !== 'admin' && session.role !== 'developer')) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = req.query;
  await prisma.apiKey.delete({ where: { id: id as string } });
  return res.status(200).json({ ok: true });
}
