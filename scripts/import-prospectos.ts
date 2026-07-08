// scripts/import-prospectos.ts
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('DATABASE_URL no definida'); process.exit(1); }

const useSsl =
  process.env.DATABASE_SSL === 'true' ||
  connectionString.includes('sslmode=require') ||
  connectionString.includes('sslmode=no-verify');

const rejectUnauthorized =
  !connectionString.includes('sslmode=no-verify') &&
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';

const pool = new Pool({
  connectionString,
  ...(useSsl && {
    ssl: { rejectUnauthorized },
  }),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const dataPath = path.join(__dirname, 'data.json');

  if (!fs.existsSync(dataPath)) {
    console.error('No se encontró scripts/data.json — ejecuta el scraper primero.');
    process.exit(1);
  }

  // Guardar timestamp de inicio para que la limpieza sepa qué registros son de esta corrida
  const syncStartFile = path.join(process.cwd(), '.sync-start.json');
  fs.writeFileSync(syncStartFile, JSON.stringify({ importStartedAt: new Date().toISOString() }));

  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const registros: any[] = Array.isArray(raw) ? raw : [];

  console.log(`Importando ${registros.length} prospectos...`);

  let nuevos = 0;
  let yaExistian = 0;
  let sinCoords = 0;

  for (const r of registros) {
    if (!r.nro_orden || r._error || !r.latitud || !r.longitud) {
      sinCoords++;
      continue;
    }

    const datos = {
      estado:           r.estado           || null,
      prioridad:        r.prioridad        || null,
      idCliente:        r.id_cliente       || null,
      contrato:         r.contrato         || null,
      contratoLigado:   r.contrato_ligado  || null,
      tipoOrden:        r.tipo_orden       || null,
      tipoServicio:     r.tipo_servicio    || null,
      tipoAveria:       r.tipo_averia      || null,
      motivo:           r.motivo           || null,
      descripcion:      r.descripcion      || null,
      tecnico:          r.tecnico          || null,
      usuarioCreador:   r.usuario_creador  || null,
      usuarioEnvio:     r.usuario_envio    || null,
      cliente:          r.cliente          || null,
      contactoNombre:   r.contacto_nombre  || null,
      contactoApellido: r.contacto_apellido|| null,
      telCelular:       r.tel_celular      || null,
      telInstalacion:   r.tel_instalacion  || null,
      telOficina:       r.tel_oficina      || null,
      email:            r.email            || null,
      sucursal:         r.sucursal         || null,
      despacho:         r.despacho         || null,
      provincia:        r.provincia        || null,
      canton:           r.canton           || null,
      distrito:         r.distrito         || null,
      barrio:           r.barrio           || null,
      direccion:        r.direccion        || null,
      observaciones:    r.observaciones    || null,
      banderaCable:     r.bandera_cable    || null,
      banderaInternet:  r.bandera_internet || null,
      facturador:       r.facturador       || null,
      tap:              r.tap              || null,
      placa:            r.placa            || null,
      poste:            r.poste            || null,
      latitud:          r.latitud          || null,
      longitud:         r.longitud         || null,
    };

    const llave = r.id_cliente
      ? { idCliente: r.id_cliente }
      : { nroOrden: r.nro_orden };

    const existe = await prisma.prospecto.findFirst({ where: llave });
    if (existe) {
      yaExistian++;
    } else {
      await prisma.prospecto.create({ data: { nroOrden: r.nro_orden, ...datos } });
      nuevos++;
    }
  }

  console.log(`✓ Nuevos: ${nuevos} | Ya existían: ${yaExistian} | Sin coords: ${sinCoords}`);

  fs.writeFileSync(
    path.join(process.cwd(), '.sync-import-stats.json'),
    JSON.stringify({ totalEncontrados: registros.length, nuevos, yaExistian, sinCoords, fecha: new Date().toISOString() }),
  );
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
