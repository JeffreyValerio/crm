import { prisma } from '../src/lib/prisma';

const TIPIFICACIONES = [
  { valor: 'VENTA_REALIZADA',       etiqueta: '✅ Venta realizada',              orden: 0, creaCliente: true,  eliminaProspecto: false },
  { valor: 'CLIENTE_INTERESADO',    etiqueta: '⭐ Cliente interesado',            orden: 1, creaCliente: false, eliminaProspecto: false },
  { valor: 'SEGUIMIENTO',           etiqueta: '🔄 Seguimiento',                   orden: 2, creaCliente: false, eliminaProspecto: false },
  { valor: 'LLAMAR_MAS_TARDE',      etiqueta: '⏰ Llamar más tarde',              orden: 3, creaCliente: false, eliminaProspecto: false },
  { valor: 'LLAMADA',               etiqueta: '📞 Llamada',                       orden: 4, creaCliente: false, eliminaProspecto: false },
  { valor: 'WHATSAPP',              etiqueta: '💬 WhatsApp',                      orden: 5, creaCliente: false, eliminaProspecto: false },
  { valor: 'CLIENTE_NO_INTERESADO', etiqueta: '👎 Cliente no interesado',         orden: 6, creaCliente: false, eliminaProspecto: false },
  { valor: 'OTRO_PROVEEDOR',        etiqueta: '🔀 Cuenta con otro proveedor',     orden: 7, creaCliente: false, eliminaProspecto: false },
  { valor: 'CLIENTE_MOLESTO',       etiqueta: '😡 Cliente molesto',               orden: 8, creaCliente: false, eliminaProspecto: false },
  { valor: 'SIN_COBERTURA',         etiqueta: '📵 Sin cobertura',                 orden: 9, creaCliente: false, eliminaProspecto: true  },
];

async function main() {
  for (const t of TIPIFICACIONES) {
    await prisma.tipificacion.upsert({
      where: { valor: t.valor },
      update: { etiqueta: t.etiqueta, orden: t.orden, creaCliente: t.creaCliente, eliminaProspecto: t.eliminaProspecto },
      create: { ...t, activa: true },
    });
  }
  console.log(`✔ ${TIPIFICACIONES.length} tipificaciones seedeadas`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
