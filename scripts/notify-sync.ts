import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const NOTIFY_TO = 'jeffreyvalerio@hotmail.com, cvalerioa24@gmail.com';

async function main() {
  // Leer stats del import
  const importStatsFile = join(process.cwd(), '.sync-import-stats.json');
  let importStats = { totalEncontrados: 0, nuevos: 0, yaExistian: 0, sinCoords: 0 };
  if (existsSync(importStatsFile)) {
    importStats = JSON.parse(readFileSync(importStatsFile, 'utf-8'));
  }

  // Leer stats del script de limpieza
  const statsFile = join(process.cwd(), '.sync-stats.json');
  let cleanupStats = { totalConFibra: 0, totalBorrados: 0, totalErrores: 0, fechaFin: new Date().toISOString() };
  if (existsSync(statsFile)) {
    cleanupStats = JSON.parse(readFileSync(statsFile, 'utf-8'));
  }

  // Contar estado actual de la DB
  const totalActual = await prisma.prospecto.count();

  const fechaFin = new Date(cleanupStats.fechaFin).toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8fafc; border-radius: 8px; padding: 24px; border: 1px solid #e2e8f0;">
        <h2 style="color: #2563eb; margin-top: 0;">✅ Sync de prospectos completado</h2>
        <p style="color: #64748b; margin-bottom: 24px;">${fechaFin}</p>

        <h3 style="font-size: 14px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
          Import
        </h3>
        <table style="width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 16px;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; color: #64748b;">📋 Encontrados en el scraper</td>
            <td style="padding: 12px 16px; text-align: right; font-weight: 600;">${importStats.totalEncontrados.toLocaleString('es-CR')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; color: #2563eb;">➕ Nuevos en DB</td>
            <td style="padding: 12px 16px; text-align: right; font-weight: 600;">${importStats.nuevos.toLocaleString('es-CR')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; color: #64748b;">⏭️ Ya existían (sin cambios)</td>
            <td style="padding: 12px 16px; text-align: right; font-weight: 600;">${importStats.yaExistian.toLocaleString('es-CR')}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #d97706;">📍 Sin coordenadas (omitidos)</td>
            <td style="padding: 12px 16px; text-align: right; font-weight: 600;">${importStats.sinCoords.toLocaleString('es-CR')}</td>
          </tr>
        </table>

        <h3 style="font-size: 14px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
          Limpieza de cobertura
        </h3>
        <table style="width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 16px;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; color: #16a34a;">✅ Con cobertura fibra</td>
            <td style="padding: 12px 16px; text-align: right; font-weight: 600;">${cleanupStats.totalConFibra.toLocaleString('es-CR')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; color: #dc2626;">❌ Eliminados (sin cobertura)</td>
            <td style="padding: 12px 16px; text-align: right; font-weight: 600;">${cleanupStats.totalBorrados.toLocaleString('es-CR')}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #d97706;">⚠️ Errores WMS</td>
            <td style="padding: 12px 16px; text-align: right; font-weight: 600;">${cleanupStats.totalErrores.toLocaleString('es-CR')}</td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px;">
              <span style="font-size: 13px; color: #64748b;">Total prospectos en DB ahora</span>
              <div style="font-size: 28px; font-weight: bold; color: #1e293b;">${totalActual.toLocaleString('es-CR')}</div>
            </td>
          </tr>
        </table>

        <br>
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          Este correo fue generado automáticamente por el CRM después del sync de prospectos.
        </p>
      </div>
    </body>
    </html>
  `;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });

  await transporter.sendMail({
    from: `"CRM" <${process.env.SMTP_USER}>`,
    to: NOTIFY_TO,
    subject: `✅ Sync completado — ${cleanupStats.totalBorrados.toLocaleString('es-CR')} eliminados, ${totalActual.toLocaleString('es-CR')} restantes`,
    html,
  });

  console.log(`📧 Email enviado a ${NOTIFY_TO}`);
}

main()
  .catch(e => { console.error('Error enviando notificación:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
