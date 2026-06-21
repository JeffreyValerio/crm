import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

const RESULTADOS_VALIDOS = [
  'VENTA_REALIZADA',
  'CLIENTE_INTERESADO',
  'SEGUIMIENTO',
  'SIN_COBERTURA',
  'LLAMAR_MAS_TARDE',
  'CLIENTE_NO_INTERESADO',
  'OTRO_PROVEEDOR',
  'CLIENTE_MOLESTO',
  'LLAMADA',
  'WHATSAPP',
] as const;

type Resultado = typeof RESULTADOS_VALIDOS[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'ID inválido' });

  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Método no permitido' });

  const { resultado } = req.body as { resultado: Resultado };
  if (!resultado || !RESULTADOS_VALIDOS.includes(resultado)) {
    return res.status(400).json({ error: `resultado debe ser uno de: ${RESULTADOS_VALIDOS.join(', ')}` });
  }

  const prospecto = await prisma.prospecto.findUnique({ where: { id } });
  if (!prospecto) return res.status(404).json({ error: 'No encontrado' });

  if (session.role !== 'admin' && prospecto.asignadoA !== session.userId) {
    return res.status(403).json({ error: 'Sin acceso' });
  }

  // Sin cobertura: eliminar el prospecto directamente
  if (resultado === 'SIN_COBERTURA') {
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
    },
    include: {
      asignado: { select: { id: true, nombre: true, apellidos: true, email: true } },
    },
  });

  // Si es venta realizada, crear el cliente y asignarlo al usuario actual
  if (resultado === 'VENTA_REALIZADA') {
    // Limpiar teléfono: quitar +506, espacios y guiones — dejar solo los 8 dígitos.
    function sanitizarTel(raw: string | null): string | null {
      if (!raw) return null;
      return raw.replace(/^\+506\s?/, '').replace(/[-\s]/g, '') || null;
    }

    // Limpiar la cédula: quitar guiones, espacios y cualquier carácter no alfanumérico.
    // Si es solo dígitos, también quitar ceros iniciales (01-1753-0918 → 117530918).
    function sanitizarCedula(raw: string | null): string | null {
      if (!raw) return null;
      const limpio = raw.replace(/[^a-zA-Z0-9]/g, '');
      if (/^\d+$/.test(limpio)) return limpio.replace(/^0+/, '') || limpio;
      return limpio || null;
    }

    const cedulaLimpia = sanitizarCedula(prospecto.idCliente);

    // Buscar si ya existe un cliente con esa cédula para no duplicar
    const cedulaExistente = cedulaLimpia
      ? await prisma.client.findFirst({ where: { numeroIdentificacion: cedulaLimpia } })
      : null;

    if (!cedulaExistente) {
      // Parsear nombres y apellidos
      const nombres =
        prospecto.contactoNombre ||
        (prospecto.cliente ? prospecto.cliente.split(' ')[0] : 'Sin nombre');
      const apellidos =
        prospecto.contactoApellido ||
        (prospecto.cliente ? prospecto.cliente.split(' ').slice(1).join(' ') : '') ||
        'Sin apellido';

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

    // Ya existía cliente con esa cédula
    return res.status(200).json({ prospecto: updated, clienteCreado: cedulaExistente });
  }

  return res.status(200).json({ prospecto: updated });
}
