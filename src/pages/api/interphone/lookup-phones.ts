import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

interface ProspectoRow {
  id: string;
  nroOrden: string;
  cliente: string | null;
  matched_tel: string;
}

interface ClienteRow {
  id: string;
  nombres: string;
  apellidos: string;
  matched_tel: string;
}

export interface VinculoInfo {
  tipo: 'prospecto' | 'cliente';
  id: string;
  nombre: string;
  nroOrden?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).end();

  const raw: unknown[] = Array.isArray(req.body?.numeros) ? req.body.numeros : [];
  const numeros = raw
    .map(n => String(n).replace(/\D/g, ''))
    .filter(n => n.length >= 7);

  if (numeros.length === 0) return res.status(200).json({});

  const [prospectos, clientes] = await Promise.all([
    prisma.$queryRaw<ProspectoRow[]>`
      SELECT id, "nroOrden", cliente,
        CASE
          WHEN regexp_replace(COALESCE("telCelular",''),   '[^0-9]','','g') = ANY(${numeros}::text[])
            THEN regexp_replace(COALESCE("telCelular",''),   '[^0-9]','','g')
          WHEN regexp_replace(COALESCE("telInstalacion",''),'[^0-9]','','g') = ANY(${numeros}::text[])
            THEN regexp_replace(COALESCE("telInstalacion",''),'[^0-9]','','g')
          ELSE regexp_replace(COALESCE("telOficina",''),   '[^0-9]','','g')
        END AS matched_tel
      FROM "Prospecto"
      WHERE
        regexp_replace(COALESCE("telCelular",''),   '[^0-9]','','g') = ANY(${numeros}::text[])
        OR regexp_replace(COALESCE("telInstalacion",''),'[^0-9]','','g') = ANY(${numeros}::text[])
        OR regexp_replace(COALESCE("telOficina",''), '[^0-9]','','g') = ANY(${numeros}::text[])
    `,
    prisma.$queryRaw<ClienteRow[]>`
      SELECT id, nombres, apellidos,
        regexp_replace(COALESCE(telefono,''),'[^0-9]','','g') AS matched_tel
      FROM "Client"
      WHERE regexp_replace(COALESCE(telefono,''),'[^0-9]','','g') = ANY(${numeros}::text[])
        AND telefono IS NOT NULL
    `,
  ]);

  const result: Record<string, VinculoInfo> = {};

  // Clientes tienen prioridad sobre prospectos
  for (const c of clientes) {
    if (c.matched_tel) {
      result[c.matched_tel] = { tipo: 'cliente', id: c.id, nombre: `${c.nombres} ${c.apellidos}` };
    }
  }
  for (const p of prospectos) {
    if (p.matched_tel && !result[p.matched_tel]) {
      result[p.matched_tel] = { tipo: 'prospecto', id: p.id, nombre: p.cliente ?? p.nroOrden, nroOrden: p.nroOrden };
    }
  }

  return res.status(200).json(result);
}
