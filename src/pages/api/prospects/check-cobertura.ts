import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { inflate as _inflate } from 'zlib';
import { promisify } from 'util';

const inflate = promisify(_inflate);

function toWebMercator(lat: number, lng: number): { x: number; y: number } {
  const x = lng * 20037508.34 / 180;
  const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180) * 20037508.34 / 180;
  return { x, y };
}

async function checkFiberCoverage(lat: number, lng: number): Promise<boolean> {
  const { x, y } = toWebMercator(lat, lng);
  // 200m de radio — preciso para la ubicación exacta del prospecto
  const delta = 200;

  const params = new URLSearchParams({
    SERVICE: 'WMS', VERSION: '1.1.1', REQUEST: 'GetMap',
    LAYERS: 'Cobertura:claro_fibra_cobertura',
    FORMAT: 'image/png', TRANSPARENT: 'TRUE',
    SRS: 'EPSG:900913',
    BBOX: `${x - delta},${y - delta},${x + delta},${y + delta}`,
    WIDTH: '10', HEIGHT: '10',
  });

  const res = await fetch(`https://mapas-claro5.addax.cc/be/wms?${params}`, {
    headers: { Referer: 'https://www.claro.cr/mapacobertura/' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`WMS error: ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());

  const idatMarker = Buffer.from([0x49, 0x44, 0x41, 0x54]); // "IDAT"
  const idatPos = buf.indexOf(idatMarker);
  if (idatPos === -1) return false;

  const idatLen = buf.readUInt32BE(idatPos - 4);
  const idatData = buf.slice(idatPos + 4, idatPos + 4 + idatLen);

  const raw = await inflate(idatData);
  // PNG 10x10 RGBA: cada fila = 1 filterbyte + 10 * 4 bytes = 41 bytes
  const bytesPerRow = 1 + 10 * 4;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const alpha = raw[row * bytesPerRow + 1 + col * 4 + 3];
      if (alpha > 0) return true; // al menos un pixel con color = hay cobertura
    }
  }
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getSession(req, res);
  if (!session.userId) return res.status(401).json({ error: 'No autenticado' });

  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Coordenadas inválidas' });
  }

  // Costa Rica: lat ~8.0–11.2, lng ~-85.9 a -82.6
  if (lat < 7 || lat > 12 || lng < -87 || lng > -82) {
    return res.status(400).json({ error: 'Coordenadas fuera de Costa Rica' });
  }

  try {
    const tieneFibra = await checkFiberCoverage(lat, lng);
    return res.status(200).json({ tieneFibra });
  } catch (error) {
    console.error('[check-cobertura]', error);
    return res.status(500).json({ error: 'Error al consultar cobertura' });
  }
}
