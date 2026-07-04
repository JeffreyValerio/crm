import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Sin permiso' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID inválido' });

  // PATCH — actualizar (etiqueta, activa, orden, flags)
  if (req.method === 'PATCH') {
    const { etiqueta, activa, orden, eliminaProspecto, creaCliente } = req.body;
    const data: Record<string, unknown> = {};
    if (etiqueta !== undefined) data.etiqueta = etiqueta.trim();
    if (activa !== undefined) data.activa = activa;
    if (orden !== undefined) data.orden = orden;
    if (eliminaProspecto !== undefined) data.eliminaProspecto = eliminaProspecto;
    if (creaCliente !== undefined) data.creaCliente = creaCliente;

    const tip = await prisma.tipificacion.update({ where: { id }, data });
    return res.status(200).json({ tipificacion: tip });
  }

  // DELETE
  if (req.method === 'DELETE') {
    await prisma.tipificacion.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
