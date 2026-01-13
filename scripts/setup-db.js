const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Script para configurar la base de datos en producción
// Se ejecuta automáticamente durante el build en Vercel

async function setupDatabase() {
  try {
    console.log('🔧 Generando cliente de Prisma...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    console.log('📦 Creando/actualizando tablas en la base de datos...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });

    console.log('✅ Base de datos configurada correctamente');
  } catch (error) {
    console.error('❌ Error al configurar la base de datos:', error.message);
    // No fallar el build si la DB no está disponible (puede ser que se cree después)
    console.log('⚠️  Continuando con el build...');
  }
}

setupDatabase();
