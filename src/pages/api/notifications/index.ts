import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'Not authenticated' });

  // GET — últimas 30 notificaciones del usuario
  if (req.method === 'GET') {
    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const unread = notifications.filter(n => !n.leida).length;
    return res.status(200).json({ notifications, unread });
  }

  // PATCH — marcar todas como leídas
  if (req.method === 'PATCH') {
    await prisma.notification.updateMany({
      where: { userId: session.userId, leida: false },
      data: { leida: true },
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
