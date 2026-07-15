/**
 * Scraper de estadísticas de extensiones Interphone.
 * Login HTTP → cookie → CSV "Hoy" → upsert en ExtensionStats.
 *
 * Uso: npx tsx scripts/scrape-extension-stats.ts
 */

import 'dotenv/config';
import https from 'https';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('DATABASE_URL no definida'); process.exit(1); }

const useSsl = process.env.DATABASE_SSL === 'true' ||
  connectionString!.includes('sslmode=require') ||
  connectionString!.includes('sslmode=no-verify');
const rejectUnauthorized = !connectionString!.includes('sslmode=no-verify') &&
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';

const pool = new Pool({
  connectionString: connectionString!,
  ...(useSsl && { ssl: { rejectUnauthorized } }),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BASE_URL  = process.env.INTERPHONE_URL      ?? 'https://113210711.interphone.cr:40711';
const USERNAME  = process.env.INTERPHONE_USERNAME  ?? 'ChristianVA@113210711.interphone.cr';
const PASSWORD  = process.env.INTERPHONE_PASSWORD  ?? '8*t+VL&g5;SEC:7';

// Agente que ignora certificados vencidos/autofirmados
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

interface FetchResult { headers: { get(k: string): string | null }; text(): Promise<string>; status: number; }

/** HTTP request via módulo https nativo (soporta agente SSL personalizado) */
function fetchInsecure(url: string, opts: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<FetchResult> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: opts.method ?? 'GET',
      headers: opts.headers ?? {},
      agent: httpsAgent,
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({
          status: res.statusCode ?? 0,
          headers: {
            get: (k: string) => {
              const v = res.headers[k.toLowerCase()];
              if (Array.isArray(v)) return v.join('; ');
              return v ?? null;
            },
          },
          text: async () => body,
        });
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  return lines.slice(1).map(line => {
    // Split respetando comillas
    const values: string[] = [];
    let current = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { values.push(current); current = ''; continue; }
      current += ch;
    }
    values.push(current);
    return Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() ?? '']));
  });
}

function toInt(v: string): number {
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}

function toFloat(v: string): number | null {
  if (!v) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

export async function scrapeExtensionStats(): Promise<{ scraped: number; fecha: string }> {
  // ── 1. Login ─────────────────────────────────────────────────────────────────
  const loginUrl = `${BASE_URL}/core/dashboard/`;
  const loginBody = new URLSearchParams({ username: USERNAME, password: PASSWORD }).toString();

  const loginRes = await fetchInsecure(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: loginBody,
  });

  const setCookie = loginRes.headers.get('set-cookie') ?? '';
  const phpSessId = setCookie.match(/PHPSESSID=([^;]+)/)?.[1];
  if (!phpSessId) throw new Error('Login fallido — no se recibió PHPSESSID');

  const cookie = `PHPSESSID=${phpSessId}`;
  console.log(`[scrape] Login OK — sesión: ${phpSessId.slice(0, 8)}...`);

  // ── 2. Fetch CSV de Hoy (quick_select=3) ─────────────────────────────────────
  const csvUrl = `${BASE_URL}/app/xml_cdr/xml_cdr_extension_summary.php?type=csv&quick_select=3`;
  const csvRes = await fetchInsecure(csvUrl, { headers: { cookie } });
  const csvText = await csvRes.text();

  if (!csvText.includes('extension')) {
    throw new Error('CSV inválido o sesión expirada');
  }

  const rows = parseCsv(csvText);
  console.log(`[scrape] CSV recibido — ${rows.length} extensiones`);

  // ── 3. Upsert en DB ───────────────────────────────────────────────────────────
  // Usar medianoche UTC del día actual como clave de fecha
  const now = new Date();
  const fecha = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  let upserted = 0;
  for (const row of rows) {
    const ext = row['extension'];
    if (!ext) continue;

    await prisma.extensionStats.upsert({
      where: { extension_fecha: { extension: ext, fecha } },
      update: {
        respondido:         toInt(row['answered']),
        perdidas:           toInt(row['missed']),
        correoVoz:          toInt(row['voicemail']),
        sinRespuesta:       toInt(row['no_answer']),
        ocupado:            toInt(row['busy']),
        alocSegundos:       toFloat(row['aloc']),
        llamadasEntrantes:  toInt(row['inbound_calls']),
        duracionInboundSeg: toInt(row['inbound_duration']),
        llamadasSalientes:  toInt(row['outbound_calls']),
        duracionSalidaSeg:  toInt(row['outbound_duration']),
      },
      create: {
        extension:          ext,
        fecha,
        respondido:         toInt(row['answered']),
        perdidas:           toInt(row['missed']),
        correoVoz:          toInt(row['voicemail']),
        sinRespuesta:       toInt(row['no_answer']),
        ocupado:            toInt(row['busy']),
        alocSegundos:       toFloat(row['aloc']),
        llamadasEntrantes:  toInt(row['inbound_calls']),
        duracionInboundSeg: toInt(row['inbound_duration']),
        llamadasSalientes:  toInt(row['outbound_calls']),
        duracionSalidaSeg:  toInt(row['outbound_duration']),
      },
    });
    upserted++;
  }

  const fechaStr = fecha.toISOString().slice(0, 10);
  console.log(`[scrape] ${upserted} extensiones guardadas para ${fechaStr}`);
  return { scraped: upserted, fecha: fechaStr };
}

// Ejecutar directamente si se llama como script
if (require.main === module || import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  scrapeExtensionStats()
    .then(r => { console.log('[scrape] Listo:', r); process.exit(0); })
    .catch(e => { console.error('[scrape] Error:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
