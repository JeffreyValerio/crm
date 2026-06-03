import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'Not authenticated' });

  const { year, createdBy } = req.query;
  const y = year ? parseInt(year as string) : new Date().getFullYear();

  const creatorFilter =
    session.role !== 'admin'
      ? { createdBy: session.userId }
      : createdBy && typeof createdBy === 'string'
      ? { createdBy }
      : {};

  try {
    // ── 1. Tendencia mensual: registros + instalaciones ──────────────────────
    // Clientes registrados por mes (createdAt)
    const registrados = await prisma.client.findMany({
      where: {
        ...creatorFilter,
        createdAt: {
          gte: new Date(Date.UTC(y, 0, 1)),
          lt: new Date(Date.UTC(y + 1, 0, 1)),
        },
      },
      select: { createdAt: true },
    });

    // Clientes instalados por mes (instaladaAt)
    const instalados = await prisma.client.findMany({
      where: {
        ...creatorFilter,
        saleStatus: 'INSTALADA',
        instaladaAt: {
          gte: new Date(Date.UTC(y, 0, 1)),
          lt: new Date(Date.UTC(y + 1, 0, 1)),
        },
      },
      select: { instaladaAt: true },
    });

    // Agrupar por mes
    const tendencia = MESES.map((mes, i) => ({
      mes,
      registrados: registrados.filter(c => new Date(c.createdAt).getUTCMonth() === i).length,
      instalaciones: instalados.filter(c => c.instaladaAt && new Date(c.instaladaAt).getUTCMonth() === i).length,
    }));

    // ── 2. Comparativa por vendedor (instalaciones por mes) ──────────────────
    let comparativa: Array<{ mes: string; [vendedor: string]: number | string }> = [];

    if (session.role === 'admin') {
      const instPorVendedor = await prisma.client.findMany({
        where: {
          ...creatorFilter,
          saleStatus: 'INSTALADA',
          instaladaAt: {
            gte: new Date(Date.UTC(y, 0, 1)),
            lt: new Date(Date.UTC(y + 1, 0, 1)),
          },
        },
        select: {
          instaladaAt: true,
          creator: { select: { id: true, nombre: true, apellidos: true, email: true } },
        },
      });

      // Obtener vendedores únicos
      const vendedoresMap = new Map<string, string>();
      instPorVendedor.forEach(c => {
        const nombre = c.creator.nombre && c.creator.apellidos
          ? `${c.creator.nombre} ${c.creator.apellidos}`
          : c.creator.email;
        vendedoresMap.set(c.creator.id, nombre);
      });

      // Construir matriz mes × vendedor
      comparativa = MESES.map((mes, i) => {
        const row: { mes: string; [k: string]: number | string } = { mes };
        vendedoresMap.forEach((nombre, userId) => {
          row[nombre] = instPorVendedor.filter(
            c => c.creator.id === userId && c.instaladaAt && new Date(c.instaladaAt).getUTCMonth() === i
          ).length;
        });
        return row;
      });
    }

    return res.status(200).json({
      tendencia,
      comparativa,
      vendedores: session.role === 'admin'
        ? [...new Set(
            (await prisma.client.findMany({
              where: {
                ...creatorFilter,
                saleStatus: 'INSTALADA',
                instaladaAt: {
                  gte: new Date(Date.UTC(y, 0, 1)),
                  lt: new Date(Date.UTC(y + 1, 0, 1)),
                },
              },
              select: { creator: { select: { nombre: true, apellidos: true, email: true } } },
            })).map(c =>
              c.creator.nombre && c.creator.apellidos
                ? `${c.creator.nombre} ${c.creator.apellidos}`
                : c.creator.email
            )
          )]
        : [],
    });
  } catch (error) {
    console.error('Trends error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
