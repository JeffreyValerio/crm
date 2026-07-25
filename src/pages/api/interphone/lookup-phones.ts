import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export interface VinculoInfo {
  tipo: 'prospecto' | 'cliente';
  id: string;
  nombre: string;
  nroOrden?: string;
}

function normalize(tel: string | null | undefined): string {
  return (tel ?? '').replace(/\D/g, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).end();

  const raw: unknown[] = Array.isArray(req.body?.numeros) ? req.body.numeros : [];
  const numeros = [...new Set(
    raw.map(n => normalize(String(n))).filter(n => n.length >= 7)
  )];

  if (numeros.length === 0) return res.status(200).json({});

  // Busca solo registros que coincidan — no trae toda la tabla
  const [prospectos, clientes] = await Promise.all([
    prisma.prospecto.findMany({
      where: {
        OR: [
          { telCelular: { in: numeros } },
          { telInstalacion: { in: numeros } },
          { telOficina: { in: numeros } },
        ],
      },
      select: { id: true, nroOrden: true, cliente: true, telCelular: true, telInstalacion: true, telOficina: true },
    }),
    prisma.client.findMany({
      where: { telefono: { in: numeros } },
      select: { id: true, nombres: true, apellidos: true, telefono: true },
    }),
  ]);

  const result: Record<string, VinculoInfo> = {};

  // Clientes tienen prioridad
  for (const c of clientes) {
    const tel = normalize(c.telefono);
    if (tel) result[tel] = { tipo: 'cliente', id: c.id, nombre: `${c.nombres} ${c.apellidos}` };
  }

  for (const p of prospectos) {
    for (const phone of [p.telCelular, p.telInstalacion, p.telOficina]) {
      const tel = normalize(phone);
      if (tel && !result[tel]) {
        result[tel] = { tipo: 'prospecto', id: p.id, nombre: p.cliente ?? p.nroOrden, nroOrden: p.nroOrden };
        break;
      }
    }
  }

  console.log(`[lookup-phones] buscados=${numeros.length} encontrados=${Object.keys(result).length}`);
  return res.status(200).json(result);
}
