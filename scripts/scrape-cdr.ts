/**
 * Scraper de CDR (Call Detail Records) de Interphone.
 * Login HTTP → cookie → parsea HTML de xml_cdr.php página por página → upsert en CdrLlamada.
 * Trae las últimas N páginas (por defecto hoy + ayer) para mantener la DB sincronizada.
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

const BASE_URL = process.env.INTERPHONE_URL      ?? 'https://113210711.interphone.cr:40711';
const USERNAME = process.env.INTERPHONE_USERNAME  ?? 'ChristianVA@113210711.interphone.cr';
const PASSWORD = process.env.INTERPHONE_PASSWORD  ?? '8*t+VL&g5;SEC:7';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function fetchInsecure(url: string, opts: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; headers: { get(k: string): string | null }; text(): Promise<string> }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      { hostname: parsed.hostname, port: parsed.port || 443, path: parsed.pathname + parsed.search, method: opts.method ?? 'GET', headers: opts.headers ?? {}, agent: httpsAgent },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            status: res.statusCode ?? 0,
            headers: { get: (k: string) => { const v = res.headers[k.toLowerCase()]; return Array.isArray(v) ? v.join('; ') : v ?? null; } },
            text: async () => body,
          });
        });
      }
    );
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ── Parser HTML ───────────────────────────────────────────────────────────────

function htmlText(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&eacute;/g, 'é').replace(/&Eacute;/g, 'É')
    .replace(/&aacute;/g, 'á').replace(/&Aacute;/g, 'Á')
    .replace(/&iacute;/g, 'í').replace(/&Iacute;/g, 'Í')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&uacute;/g, 'ú').replace(/&Uacute;/g, 'Ú')
    .replace(/&ntilde;/g, 'ñ').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&lowbar;/g, '_').replace(/&period;/g, '.').replace(/&sol;/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAttr(s: string, attr: string): string {
  const m = s.match(new RegExp(`${attr}=["']([^"']+)["']`));
  return m?.[1] ?? '';
}

interface CdrRecord {
  uuid: string;
  extension: string;
  direccion: string;
  cidNumero: string;
  destino: string;
  grabacionId: string | null;
  fecha: Date;
  duracion: string;
  estado: string;
  causaColgar: string | null;
}

// Parsea un número de teléfono de un número con CID - limpia espacios extra
function cleanPhone(s: string): string {
  return s.replace(/\s+/g, '').trim();
}

// Convierte "25 Jul 2026 09:44 am" → Date
const MES: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  Ene: 0, Feb2: 1, Mar2: 2, Abr: 3, Mayo: 4, Jun2: 5,
  Jul2: 6, Ago: 7, Set: 8, Oct2: 9, Nov2: 10, Dic: 11,
};

function parseDate(fecha: string, tiempo: string): Date {
  // "25 Jul 2026", "09:44 am"
  const [day, mes, year] = fecha.trim().split(' ');
  const [timePart, ampm] = tiempo.trim().split(' ');
  let [hh, mm] = timePart.split(':').map(Number);
  if (ampm === 'pm' && hh !== 12) hh += 12;
  if (ampm === 'am' && hh === 12) hh = 0;
  const monthIdx = MES[mes] ?? 0;
  return new Date(Date.UTC(parseInt(year), monthIdx, parseInt(day), hh + 6, mm, 0)); // +6 CR offset
}

function parsePage(body: string): { records: CdrRecord[]; totalPages: number } {
  const tableStart = body.indexOf("<table class='list'>");
  if (tableStart === -1) return { records: [], totalPages: 1 };

  const tableEnd = body.indexOf('</table>', tableStart);
  const tableHtml = body.slice(tableStart, tableEnd);

  const records: CdrRecord[] = [];

  // Cada registro de datos tiene <tr class='list-row' href=''>
  const parts = tableHtml.split("<tr class='list-row' href=''>");

  for (let i = 1; i < parts.length; i++) {
    const rowEnd = parts[i].indexOf('</tr>');
    const rowHtml = parts[i].slice(0, rowEnd);

    // Extraer celdas td de forma lineal
    const tds: string[] = [];
    let pos = 0;
    while ((pos = rowHtml.indexOf('<td', pos)) !== -1) {
      const closePos = rowHtml.indexOf('</td>', pos);
      if (closePos === -1) break;
      tds.push(rowHtml.slice(pos, closePos + 5));
      pos = closePos + 5;
    }

    if (tds.length < 9) continue;

    // td[0]: icono de dirección/estado
    const iconTitle = getAttr(tds[0], 'title'); // "Salida: Respondido"
    const [direccionRaw] = iconTitle.split(':');
    const direccion = direccionRaw?.trim() ?? '';

    // td[1]: extensión
    const extension = htmlText(tds[1]);

    // td[2]: CID nombre → title tiene el número
    const cidNombre = getAttr(tds[2], 'title') || htmlText(tds[2]);

    // td[3]: CID número
    const cidNumero = cleanPhone(htmlText(tds[3]));

    // td[4]: destino
    const destino = cleanPhone(htmlText(tds[4]));

    // td[5]: grabación — buscar UUID en id attr
    const grabacionMatch = tds[5].match(/id=['"]recording_button_([a-f0-9-]{36})['"]/);
    const grabacionId = grabacionMatch?.[1] ?? null;

    // td[6]: fecha
    const fecha = htmlText(tds[6]);

    // td[7]: tiempo
    const tiempo = htmlText(tds[7]);

    // td[8]: duración
    const duracion = htmlText(tds[8]);

    // td[9]: estado
    const estado = htmlText(tds[9] ?? '');

    // td[10]: causa colgar
    const causaColgar = htmlText(tds[10] ?? '') || null;

    // Generar UUID único: grabación UUID si existe, sino hash de extension+fecha+tiempo+destino
    const uuid = grabacionId ?? `${extension}-${fecha}-${tiempo}-${destino}`.replace(/\s/g, '_');

    let fechaDate: Date;
    try {
      fechaDate = parseDate(fecha, tiempo);
    } catch {
      continue;
    }

    records.push({ uuid, extension, direccion, cidNumero, destino, grabacionId, fecha: fechaDate, duracion, estado, causaColgar });
  }

  // Total páginas: <strong>N</strong> aparece solo con params explícitos de filtro
  const strongMatch = body.match(/<strong>(\d+)<\/strong>/);
  const totalPages = strongMatch ? parseInt(strongMatch[1]) : null; // null = no se sabe aún

  return { records, totalPages: totalPages ?? 99 };
}

// ── Scraper principal ─────────────────────────────────────────────────────────

export async function scrapeCdr(maxPages = 3): Promise<{ scraped: number; paginas: number }> {
  // 1. Login
  const loginRes = await fetchInsecure(`${BASE_URL}/core/dashboard/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `username=${encodeURIComponent(USERNAME)}&password=${encodeURIComponent(PASSWORD)}`,
  });
  const phpSessId = loginRes.headers.get('set-cookie')?.match(/PHPSESSID=([^;]+)/)?.[1];
  if (!phpSessId) throw new Error('Login fallido — no se recibió PHPSESSID');
  const cookie = `PHPSESSID=${phpSessId}`;
  console.log(`[cdr] Login OK — ${phpSessId.slice(0, 8)}...`);

  // Warmup
  const location = loginRes.headers.get('location');
  const warmupUrl = location ? (location.startsWith('http') ? location : `${BASE_URL}${location}`) : `${BASE_URL}/core/dashboard/`;
  await fetchInsecure(warmupUrl, { headers: { cookie } });

  // 2. Iterar páginas (más recientes primero — page=0 es la más reciente)
  let totalUpserted = 0;
  let paginasLeidas = 0;
  let totalPages = 1;

  for (let page = 0; page < maxPages; page++) {
    // Parámetros vacíos explícitos para que el sistema muestre el total de páginas en <strong>N</strong>
    const url = `${BASE_URL}/app/xml_cdr/xml_cdr.php?page=${page}&direction=&status=&extension_uuid=&caller_id_name=&caller_id_number=&start_stamp_begin=&start_stamp_end=`;
    const res = await fetchInsecure(url, { headers: { cookie } });
    const body = await res.text();

    const { records, totalPages: tp } = parsePage(body);
    if (page === 0) totalPages = tp;

    if (records.length === 0) {
      console.log(`[cdr] Página ${page + 1}: sin registros, deteniendo`);
      break;
    }

    console.log(`[cdr] Página ${page + 1}/${Math.min(maxPages, totalPages)}: ${records.length} registros`);

    // Upsert en DB
    for (const r of records) {
      await prisma.cdrLlamada.upsert({
        where: { uuid: r.uuid },
        update: {
          extension: r.extension,
          direccion: r.direccion,
          cidNumero: r.cidNumero,
          destino: r.destino,
          grabacionId: r.grabacionId,
          fecha: r.fecha,
          duracion: r.duracion,
          estado: r.estado,
          causaColgar: r.causaColgar,
        },
        create: {
          uuid: r.uuid,
          extension: r.extension,
          direccion: r.direccion,
          cidNumero: r.cidNumero,
          destino: r.destino,
          grabacionId: r.grabacionId,
          fecha: r.fecha,
          duracion: r.duracion,
          estado: r.estado,
          causaColgar: r.causaColgar,
        },
      });
      totalUpserted++;
    }

    paginasLeidas++;
    if (page + 1 >= totalPages) break; // no hay más páginas
  }

  console.log(`[cdr] Total: ${totalUpserted} registros en ${paginasLeidas} páginas`);
  return { scraped: totalUpserted, paginas: paginasLeidas };
}

if (require.main === module || import.meta.url?.endsWith(process.argv[1]?.replace(/\\/g, '/'))) {
  const maxPages = process.argv[2] ? parseInt(process.argv[2]) : 3;
  scrapeCdr(maxPages)
    .then(r => { console.log('[cdr] Listo:', r); process.exit(0); })
    .catch(e => { console.error('[cdr] Error:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
