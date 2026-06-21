import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { sendProspectosAsignadosEmail } from '@/lib/mail';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID inválido' });

  if (req.method === 'GET') {
    const prospecto = await prisma.prospecto.findUnique({
      where: { id },
      include: {
        asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
      },
    });
    if (!prospecto) return res.status(404).json({ error: 'No encontrado' });

    if (session.role !== 'admin' && prospecto.asignadoA !== session.userId) {
      return res.status(403).json({ error: 'Sin acceso' });
    }

    // Buscar si el prospecto ya se convirtió en cliente (por cédula)
    let clienteConvertido: { id: string; nombres: string; apellidos: string } | null = null;
    if (prospecto.idCliente) {
      const cliente = await prisma.client.findFirst({
        where: { numeroIdentificacion: prospecto.idCliente },
        select: { id: true, nombres: true, apellidos: true },
      });
      if (cliente) clienteConvertido = cliente;
    }

    return res.status(200).json({ prospecto, clienteConvertido });
  }

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
    if (asignadoA !== undefined) {
      data.asignadoA = asignadoA || null;
      data.asignadoAt = asignadoA ? new Date() : null;
    }
    if (observacionesInternas !== undefined) data.observacionesInternas = observacionesInternas;

    const updated = await prisma.prospecto.update({
      where: { id },
      data,
      include: {
        asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
      },
    });

    // Enviar email al vendedor cuando se le asigna el prospecto
    if (asignadoA && updated.asignado?.email) {
      const destinatario = updated.asignado.nombre && updated.asignado.apellidos
        ? `${updated.asignado.nombre} ${updated.asignado.apellidos}`
        : updated.asignado.email;
      sendProspectosAsignadosEmail(updated.asignado.email, destinatario, [{
        cliente: updated.cliente,
        nroOrden: updated.nroOrden,
        telCelular: updated.telCelular,
        provincia: updated.provincia,
      }]).catch(err => console.error('[mail] Error enviando email de asignación:', err));
    }

    return res.status(200).json({ prospecto: updated });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
