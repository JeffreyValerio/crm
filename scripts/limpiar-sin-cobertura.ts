/**
 * Elimina prospectos sin cobertura de fibra óptica Claro.
 * Procesa en lotes de 10: valida, borra los sin cobertura, continúa.
 *
 * Uso:
 *   npm run prospects:limpiar                          → simulación (no borra nada)
 *   npm run prospects:limpiar -- --ejecutar            → borra en tiempo real por lotes
 *   npm run prospects:limpiar -- --asignado=<userId>   → solo ese agente
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { inflate as _inflate } from 'zlib';
import { promisify } from 'util';
import { writeFileSync } from 'fs';
import { join } from 'path';

const inflate = promisify(_inflate);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('DATABASE_URL no definida'); process.exit(1); }

const useSsl =
  process.env.DATABASE_SSL === 'true' ||
  connectionString.includes('sslmode=require') ||
  connectionString.includes('sslmode=no-verify');

const pool = new Pool({
  connectionString,
  ...(useSsl && { ssl: { rejectUnauthorized: false } }),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const EJECUTAR = process.argv.includes('--ejecutar');
const ASIGNADO = process.argv.find(a => a.startsWith('--asignado='))?.split('=')[1];
const DELAY_MS = 300;
const LOTE = 10;

function toWebMercator(lat: number, lng: number) {
  const x = lng * 20037508.34 / 180;
  const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180) * 20037508.34 / 180;
  return { x, y };
}

async function tieneCoberturaFibra(lat: number, lng: number): Promise<boolean> {
  const { x, y } = toWebMercator(lat, lng);
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

  if (!res.ok) throw new Error(`WMS ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const idatPos = buf.indexOf(Buffer.from([0x49, 0x44, 0x41, 0x54]));
  if (idatPos === -1) return false;

  const idatLen = buf.readUInt32BE(idatPos - 4);
  const raw = await inflate(buf.slice(idatPos + 4, idatPos + 4 + idatLen));

  const bpr = 1 + 10 * 4;
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++)
      if (raw[r * bpr + 1 + c * 4 + 3] > 0) return true;

  return false;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`\n🔍 Modo: ${EJECUTAR ? '⚠️  EJECUCIÓN REAL — borra por lotes de ${LOTE}' : '🧪 SIMULACIÓN (no borra nada)'}`);
  if (ASIGNADO) console.log(`👤 Filtro agente: ${ASIGNADO}`);
  console.log('');

  const where: Record<string, unknown> = {
    latitud: { not: null },
    longitud: { not: null },
  };
  if (ASIGNADO) where.asignadoA = ASIGNADO;

  const prospectos = await prisma.prospecto.findMany({
    where,
    select: { id: true, nroOrden: true, cliente: true, latitud: true, longitud: true },
  });

  const total = prospectos.length;
  console.log(`📋 Prospectos con coordenadas: ${total}\n`);

  let totalBorrados = 0;
  let totalConFibra = 0;
  let totalErrores = 0;
  const loteActual: string[] = []; // ids sin cobertura acumulados en el lote

  for (let i = 0; i < total; i++) {
    const p = prospectos[i];
    const lat = parseFloat(p.latitud!);
    const lng = parseFloat(p.longitud!);
    const prefix = `[${i + 1}/${total}]`;

    if (isNaN(lat) || isNaN(lng)) {
      console.log(`${prefix} ⚠️  Coords inválidas  — ${p.cliente}`);
      totalErrores++;
    } else {
      try {
        const tiene = await tieneCoberturaFibra(lat, lng);
        if (tiene) {
          totalConFibra++;
          console.log(`${prefix} ✅ Con fibra   — ${p.cliente}`);
        } else {
          loteActual.push(p.id);
          console.log(`${prefix} ❌ Sin fibra   — ${p.cliente}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        totalErrores++;
        console.log(`${prefix} ⚠️  Error WMS   — ${p.cliente}: ${msg}`);
      }
    }

    // Al completar cada lote (o al llegar al final), borrar los acumulados
    const esUltimo = i === total - 1;
    if (loteActual.length >= LOTE || (esUltimo && loteActual.length > 0)) {
      if (EJECUTAR) {
        const { count } = await prisma.prospecto.deleteMany({ where: { id: { in: [...loteActual] } } });
        totalBorrados += count;
        console.log(`\n🗑️  Lote eliminado: ${count} prospectos (total borrados: ${totalBorrados})\n`);
      } else {
        console.log(`\n   [SIMULACIÓN] Se borrarían ${loteActual.length} de este lote\n`);
      }
      loteActual.length = 0;
    }

    if (!esUltimo) await sleep(DELAY_MS);
  }

  console.log('\n═════════════════════════════════════════');
  console.log(`✅ Con cobertura:  ${totalConFibra}`);
  console.log(`❌ Borrados:       ${totalBorrados}`);
  console.log(`⚠️  Errores WMS:   ${totalErrores}`);
  console.log('═════════════════════════════════════════\n');

  if (!EJECUTAR && (total - totalConFibra - totalErrores) > 0) {
    console.log('Ejecuta con --ejecutar para confirmar el borrado.');
  }

  // Guardar stats para el email de notificación
  if (EJECUTAR) {
    writeFileSync(
      join(process.cwd(), '.sync-stats.json'),
      JSON.stringify({ totalConFibra, totalBorrados, totalErrores, fechaFin: new Date().toISOString() }),
    );
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
