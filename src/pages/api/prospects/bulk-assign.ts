import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { sendProspectosAsignadosEmail } from '@/lib/mail';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (session.role !== 'admin') return res.status(403).json({ error: 'Sin permiso' });
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Método no permitido' });

  const { ids, asignadoA } = req.body as { ids: string[]; asignadoA: string | null };
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un ID' });
  }

  try {
    // Obtener datos de los prospectos antes de actualizar (para el email)
    const prospectosParaEmail = asignadoA
      ? await prisma.prospecto.findMany({
          where: { id: { in: ids } },
          select: { cliente: true, nroOrden: true, telCelular: true, provincia: true },
        })
      : [];

    const result = await prisma.prospecto.updateMany({
      where: { id: { in: ids } },
      data: { asignadoA: asignadoA || null, asignadoAt: asignadoA ? new Date() : null },
    });

    // Enviar email al vendedor con todos los prospectos asignados
    if (asignadoA && prospectosParaEmail.length > 0) {
      const usuario = await prisma.user.findUnique({
        where: { id: asignadoA },
        select: { email: true, nombre: true, apellidos: true },
      });
      if (usuario?.email) {
        const destinatario = usuario.nombre && usuario.apellidos
          ? `${usuario.nombre} ${usuario.apellidos}`
          : usuario.email;
        sendProspectosAsignadosEmail(usuario.email, destinatario, prospectosParaEmail)
          .catch(err => console.error('[mail] Error enviando email bulk:', err));
      }
    }

    return res.status(200).json({ updated: result.count });
  } catch (error) {
    console.error('[bulk-assign] Error:', error);
    return res.status(500).json({ error: 'Error interno', detail: String(error) });
  }
}
