import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID inválido' });

  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Método no permitido' });

  const { resultado, proveedorCompetidor } = req.body as { resultado: string; proveedorCompetidor?: string };
  if (!resultado) return res.status(400).json({ error: 'resultado es requerido' });

  // Validar contra tipificaciones activas en DB
  const tipificacion = await prisma.tipificacion.findFirst({
    where: { valor: resultado, activa: true },
  });
  if (!tipificacion) {
    return res.status(400).json({ error: `Tipificación inválida o inactiva: ${resultado}` });
  }

  const prospecto = await prisma.prospecto.findUnique({ where: { id } });
  if (!prospecto) return res.status(404).json({ error: 'No encontrado' });

  if (session.role !== 'admin' && prospecto.asignadoA !== session.userId) {
    return res.status(403).json({ error: 'Sin acceso' });
  }

  // Eliminar prospecto si la tipificación tiene el flag eliminaProspecto
  if (tipificacion.eliminaProspecto) {
    await prisma.prospecto.delete({ where: { id } });
    return res.status(200).json({ eliminado: true });
  }

  // Actualizar el prospecto
  const updated = await prisma.prospecto.update({
    where: { id },
    data: {
      metodoContacto: resultado,
      totalContactos: { increment: 1 },
      ultimoContacto: new Date(),
      ...(proveedorCompetidor ? { proveedorCompetidor } : {}),
    },
    include: {
      asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
    },
  });

  // Crear cliente si la tipificación tiene el flag creaCliente
  if (tipificacion.creaCliente) {
    function sanitizarTel(raw: string | null): string | null {
      if (!raw) return null;
      return raw.replace(/^\+506\s?/, '').replace(/[-\s]/g, '') || null;
    }
    function sanitizarCedula(raw: string | null): string | null {
      if (!raw) return null;
      const limpio = raw.replace(/[^a-zA-Z0-9]/g, '');
      if (/^\d+$/.test(limpio)) return limpio.replace(/^0+/, '') || limpio;
      return limpio || null;
    }

    const cedulaLimpia = sanitizarCedula(prospecto.idCliente);
    const cedulaExistente = cedulaLimpia
      ? await prisma.client.findFirst({ where: { numeroIdentificacion: cedulaLimpia } })
      : null;

    if (!cedulaExistente) {
      const nombres = prospecto.contactoNombre || (prospecto.cliente ? prospecto.cliente.split(' ')[0] : 'Sin nombre');
      const apellidos = prospecto.contactoApellido || (prospecto.cliente ? prospecto.cliente.split(' ').slice(1).join(' ') : '') || 'Sin apellido';

      const clienteCreado = await prisma.client.create({
        data: {
          nombres,
          apellidos,
          tipoIdentificacion: 'NACIONAL',
          numeroIdentificacion: cedulaLimpia || `PROSPECTO-${prospecto.id}`,
          provincia: prospecto.provincia || 'Sin provincia',
          canton: prospecto.canton || 'Sin cantón',
          distrito: prospecto.distrito || 'Sin distrito',
          senasExactas: prospecto.direccion || '',
          telefono: sanitizarTel(prospecto.telCelular) || sanitizarTel(prospecto.telInstalacion) || null,
          email: prospecto.email || null,
          coordenadasLat: prospecto.latitud || null,
          coordenadasLng: prospecto.longitud || null,
          createdBy: session.userId!,
        },
        select: { id: true, nombres: true, apellidos: true },
      });
      return res.status(200).json({ prospecto: updated, clienteCreado });
    }
    return res.status(200).json({ prospecto: updated, clienteCreado: cedulaExistente });
  }

  return res.status(200).json({ prospecto: updated });
}
