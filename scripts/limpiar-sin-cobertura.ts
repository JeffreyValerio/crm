/**
 * Elimina prospectos sin cobertura de fibra óptica Claro.
 *
 * Uso:
 *   npx ts-node scripts/limpiar-sin-cobertura.ts           → simulación (no borra nada)
 *   npx ts-node scripts/limpiar-sin-cobertura.ts --ejecutar → borra realmente
 *   npx ts-node scripts/limpiar-sin-cobertura.ts --asignado=<userId>  → solo ese agente
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { inflate as _inflate } from 'zlib';
import { promisify } from 'util';

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
const DELAY_MS = 300; // pausa entre consultas WMS para no saturar el servidor

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
  console.log(`\n🔍 Modo: ${EJECUTAR ? '⚠️  EJECUCIÓN REAL (borrará prospectos)' : '🧪 SIMULACIÓN (no borra nada)'}`);
  if (ASIGNADO) console.log(`👤 Filtro agente: ${ASIGNADO}`);
  console.log('');

  const where: Record<string, unknown> = {
    latitud: { not: null },
    longitud: { not: null },
  };
  if (ASIGNADO) where.asignadoA = ASIGNADO;

  const prospectos = await prisma.prospecto.findMany({
    where,
    select: {
      id: true,
      nroOrden: true,
      cliente: true,
      latitud: true,
      longitud: true,
      asignadoA: true,
    },
  });

  console.log(`📋 Prospectos con coordenadas: ${prospectos.length}\n`);

  const sinCobertura: typeof prospectos = [];
  const conCobertura: typeof prospectos = [];
  const errores: { prospecto: (typeof prospectos)[0]; error: string }[] = [];

  for (let i = 0; i < prospectos.length; i++) {
    const p = prospectos[i];
    const lat = parseFloat(p.latitud!);
    const lng = parseFloat(p.longitud!);
    const prefix = `[${i + 1}/${prospectos.length}]`;

    if (isNaN(lat) || isNaN(lng)) {
      console.log(`${prefix} ⚠️  Coordenadas inválidas — ${p.cliente} (${p.nroOrden})`);
      errores.push({ prospecto: p, error: 'Coordenadas inválidas' });
      continue;
    }

    try {
      const tiene = await tieneCoberturaFibra(lat, lng);
      if (tiene) {
        conCobertura.push(p);
        console.log(`${prefix} ✅ Con fibra   — ${p.cliente} (${p.nroOrden})`);
      } else {
        sinCobertura.push(p);
        console.log(`${prefix} ❌ Sin fibra   — ${p.cliente} (${p.nroOrden})`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errores.push({ prospecto: p, error: msg });
      console.log(`${prefix} ⚠️  Error WMS   — ${p.cliente} (${p.nroOrden}): ${msg}`);
    }

    if (i < prospectos.length - 1) await sleep(DELAY_MS);
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`✅ Con cobertura:  ${conCobertura.length}`);
  console.log(`❌ Sin cobertura:  ${sinCobertura.length}`);
  console.log(`⚠️  Errores WMS:   ${errores.length}`);
  console.log('─────────────────────────────────────────\n');

  if (sinCobertura.length === 0) {
    console.log('No hay prospectos para eliminar.');
    return;
  }

  if (!EJECUTAR) {
    console.log('Se eliminarían los siguientes prospectos:');
    for (const p of sinCobertura) {
      console.log(`  • ${p.cliente} — ${p.nroOrden} (${p.latitud}, ${p.longitud})`);
    }
    console.log('\nEjecuta con --ejecutar para confirmar el borrado.');
    return;
  }

  // Borrado real
  console.log(`Eliminando ${sinCobertura.length} prospectos sin cobertura...`);
  const ids = sinCobertura.map(p => p.id);
  const { count } = await prisma.prospecto.deleteMany({ where: { id: { in: ids } } });
  console.log(`\n✅ ${count} prospectos eliminados.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
