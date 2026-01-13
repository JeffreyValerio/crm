import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // Crear usuario admin
  const hashedPassword = await bcrypt.hash('admin', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: {},
    create: {
      email: 'admin@admin.com',
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log('Usuario admin creado:', admin);

  // Crear tipos de producto
  const internetType = await prisma.productType.upsert({
    where: { nombre: 'Internet' },
    update: {},
    create: {
      nombre: 'Internet',
      descripcion: 'Planes de internet residencial y empresarial',
      activo: true,
    },
  });

  console.log('Tipo de producto creado:', internetType);

  // Crear planes de internet Claro
  const plans = [
    {
      nombre: 'Internet Básico 10 Mbps',
      descripcion: 'Plan básico ideal para navegación web, redes sociales y correo electrónico. Velocidad de descarga hasta 10 Mbps. Conexión estable para uso personal.',
      activo: true,
    },
    {
      nombre: 'Internet Hogar 20 Mbps',
      descripcion: 'Plan ideal para hogares pequeños con múltiples dispositivos. Velocidad de descarga hasta 20 Mbps. Perfecto para streaming de video, videollamadas y trabajo desde casa.',
      activo: true,
    },
    {
      nombre: 'Internet Hogar 50 Mbps',
      descripcion: 'Plan para familias que requieren mayor ancho de banda. Velocidad de descarga hasta 50 Mbps. Ideal para streaming en alta definición, juegos en línea y múltiples dispositivos conectados simultáneamente.',
      activo: true,
    },
    {
      nombre: 'Internet Hogar 100 Mbps',
      descripcion: 'Plan de alta velocidad para hogares con alta demanda de internet. Velocidad de descarga hasta 100 Mbps. Perfecto para streaming en 4K, teletrabajo, gaming y hogares con muchos dispositivos conectados.',
      activo: true,
    },
    {
      nombre: 'Internet Hogar 200 Mbps',
      descripcion: 'Plan premium de ultra alta velocidad con fibra óptica. Velocidad de descarga hasta 200 Mbps y subida de hasta 100 Mbps. Ideal para trabajo remoto, streaming 4K múltiple, gaming competitivo y hogares con máxima demanda de conectividad.',
      activo: true,
    },
    {
      nombre: 'Internet Fibra Óptica 300 Mbps',
      descripcion: 'Plan empresarial y residencial premium con tecnología de fibra óptica. Velocidad de descarga hasta 300 Mbps. Conexión simétrica, sin límites de datos. Perfecto para oficinas en casa y usuarios que requieren máxima velocidad y estabilidad.',
      activo: true,
    },
    {
      nombre: 'Internet Fibra Óptica 500 Mbps',
      descripcion: 'Plan de máxima velocidad con fibra óptica. Velocidad de descarga hasta 500 Mbps. Conexión simétrica ultra rápida. Ideal para empresas pequeñas, streamers profesionales y usuarios que demandan la máxima velocidad disponible.',
      activo: true,
    },
    {
      nombre: 'Internet Inalámbrico 15 GB',
      descripcion: 'Plan de internet inalámbrico móvil con 15 GB de navegación mensual. Ideal para uso móvil y zonas con cobertura inalámbrica. Perfecto para tablets, dispositivos móviles y conexión temporal.',
      activo: true,
    },
  ];

  for (const planData of plans) {
    // Verificar si el plan ya existe
    const existingPlan = await prisma.plan.findFirst({
      where: { nombre: planData.nombre },
    });

    let plan;
    if (existingPlan) {
      // Actualizar si existe
      plan = await prisma.plan.update({
        where: { id: existingPlan.id },
        data: {
          ...planData,
          productTypeId: internetType.id,
        },
      });
      console.log(`Plan actualizado: ${plan.nombre}`);
    } else {
      // Crear si no existe
      plan = await prisma.plan.create({
        data: {
          ...planData,
          productTypeId: internetType.id,
        },
      });
      console.log(`Plan creado: ${plan.nombre}`);
    }
  }

  // Obtener todos los planes creados para asignarlos a clientes
  const allPlans = await prisma.plan.findMany();
  const planIds = allPlans.map(p => p.id);

  // Crear clientes de ejemplo con diferentes estados
  const clientsData = [
    {
      nombres: 'Juan Carlos',
      apellidos: 'Rodríguez Pérez',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '1-1234-5678',
      email: 'juan.rodriguez@email.com',
      telefono: '8888-1234',
      provincia: 'San José',
      canton: 'San José',
      distrito: 'Catedral',
      senasExactas: 'Avenida Central, 200 metros norte del Banco Nacional',
      coordenadasLat: '9.9333',
      coordenadasLng: '-84.0833',
      numeroMedidor: 'MED-001234',
      planId: planIds[2], // Internet Hogar 50 Mbps
      validationStatus: 'EN_PROCESO_VALIDACION',
      validationComment: 'Cliente nuevo, validación en curso',
      saleStatus: null,
      saleComment: null,
    },
    {
      nombres: 'María Elena',
      apellidos: 'González Mora',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '2-2345-6789',
      email: 'maria.gonzalez@email.com',
      telefono: '8888-2345',
      provincia: 'Cartago',
      canton: 'Cartago',
      distrito: 'Oriental',
      senasExactas: 'Calle 5, casa #12, barrio Los Ángeles',
      coordenadasLat: '9.8636',
      coordenadasLng: '-83.9194',
      numeroMedidor: 'MED-002345',
      planId: planIds[3], // Internet Hogar 100 Mbps
      validationStatus: 'APROBADA',
      validationComment: 'Cliente aprobado, sin observaciones',
      saleStatus: 'PENDIENTE_INSTALACION',
      saleComment: 'Agendada instalación para la próxima semana',
    },
    {
      nombres: 'Carlos Alberto',
      apellidos: 'Sánchez Jiménez',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '3-3456-7890',
      email: 'carlos.sanchez@email.com',
      telefono: '8888-3456',
      provincia: 'Alajuela',
      canton: 'Alajuela',
      distrito: 'Alajuela',
      senasExactas: 'Barrio El Llano, 100 metros sur del parque',
      coordenadasLat: '10.0162',
      coordenadasLng: '-84.2113',
      numeroMedidor: 'MED-003456',
      planId: planIds[4], // Internet Hogar 200 Mbps
      validationStatus: 'APROBADA',
      validationComment: 'Validación exitosa',
      saleStatus: 'INSTALADA',
      saleComment: 'Instalación completada el mes pasado',
    },
    {
      nombres: 'Ana Patricia',
      apellidos: 'Ramírez Chaves',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '4-4567-8901',
      email: 'ana.ramirez@email.com',
      telefono: '8888-4567',
      provincia: 'Heredia',
      canton: 'Heredia',
      distrito: 'Heredia',
      senasExactas: 'Condominio Las Flores, casa #45',
      coordenadasLat: '10.0024',
      coordenadasLng: '-84.1165',
      numeroMedidor: null,
      planId: planIds[1], // Internet Hogar 20 Mbps
      validationStatus: 'REQUIERE_DEPOSITO',
      validationComment: 'Cliente requiere depósito de garantía por historial crediticio',
      saleStatus: null,
      saleComment: null,
    },
    {
      nombres: 'Roberto',
      apellidos: 'Méndez Solís',
      tipoIdentificacion: 'DIMEX',
      numeroIdentificacion: 'DIM-123456',
      email: 'roberto.mendez@email.com',
      telefono: '8888-5678',
      provincia: 'Puntarenas',
      canton: 'Puntarenas',
      distrito: 'Puntarenas',
      senasExactas: 'Barrio El Carmen, calle principal',
      coordenadasLat: '9.9760',
      coordenadasLng: '-84.8384',
      numeroMedidor: 'MED-004567',
      planId: planIds[0], // Internet Básico 10 Mbps
      validationStatus: 'NO_APLICA',
      validationComment: 'Zona no cubierta por el servicio',
      saleStatus: null,
      saleComment: null,
    },
    {
      nombres: 'Laura',
      apellidos: 'Vargas Castro',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '5-5678-9012',
      email: 'laura.vargas@email.com',
      telefono: '8888-6789',
      provincia: 'Guanacaste',
      canton: 'Liberia',
      distrito: 'Liberia',
      senasExactas: 'Avenida Central, frente al parque',
      coordenadasLat: '10.6337',
      coordenadasLng: '-85.4376',
      numeroMedidor: 'MED-005678',
      planId: planIds[5], // Internet Fibra Óptica 300 Mbps
      validationStatus: 'INCOBRABLE',
      validationComment: 'Cliente con historial de morosidad en servicios anteriores',
      saleStatus: null,
      saleComment: null,
    },
    {
      nombres: 'Diego',
      apellidos: 'Fernández Herrera',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '6-6789-0123',
      email: 'diego.fernandez@email.com',
      telefono: '8888-7890',
      provincia: 'Limón',
      canton: 'Limón',
      distrito: 'Limón',
      senasExactas: 'Barrio Cieneguita, calle 3, casa #8',
      coordenadasLat: '9.9907',
      coordenadasLng: '-83.0360',
      numeroMedidor: null,
      planId: planIds[2], // Internet Hogar 50 Mbps
      validationStatus: 'DEUDA_MENOR_ANIO',
      validationComment: 'Cliente con deuda menor a un año, requiere seguimiento',
      saleStatus: null,
      saleComment: null,
    },
    {
      nombres: 'Sofía',
      apellidos: 'Morales Rojas',
      tipoIdentificacion: 'PASAPORTE',
      numeroIdentificacion: 'P12345678',
      email: 'sofia.morales@email.com',
      telefono: '8888-8901',
      provincia: 'San José',
      canton: 'Escazú',
      distrito: 'Escazú',
      senasExactas: 'Condominio Los Yoses, torre 2, apto 305',
      coordenadasLat: '9.9186',
      coordenadasLng: '-84.1400',
      numeroMedidor: 'MED-006789',
      planId: planIds[3], // Internet Hogar 100 Mbps
      validationStatus: 'APROBADA',
      validationComment: 'Cliente aprobado',
      saleStatus: 'CANCELADA',
      saleComment: 'Cliente canceló la instalación por cambio de planes',
    },
    {
      nombres: 'Empresa XYZ',
      apellidos: 'S.A.',
      tipoIdentificacion: 'JURIDICA',
      numeroIdentificacion: '3-101-123456',
      email: 'contacto@empresaxyz.com',
      telefono: '2222-0000',
      provincia: 'San José',
      canton: 'San José',
      distrito: 'San Francisco',
      senasExactas: 'Edificio Corporativo, piso 5, oficina 501',
      coordenadasLat: '9.9281',
      coordenadasLng: '-84.0907',
      numeroMedidor: 'MED-007890',
      planId: planIds[6], // Internet Fibra Óptica 500 Mbps
      validationStatus: 'APROBADA',
      validationComment: 'Empresa con excelente historial crediticio',
      saleStatus: 'INSTALADA',
      saleComment: 'Instalación empresarial completada',
    },
    {
      nombres: 'Pedro',
      apellidos: 'Castro Umaña',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '7-7890-1234',
      email: 'pedro.castro@email.com',
      telefono: '8888-9012',
      provincia: 'Cartago',
      canton: 'Paraíso',
      distrito: 'Paraíso',
      senasExactas: 'Barrio San Rafael, 50 metros este de la iglesia',
      coordenadasLat: '9.8333',
      coordenadasLng: '-83.8667',
      numeroMedidor: null,
      planId: planIds[1], // Internet Hogar 20 Mbps
      validationStatus: 'EN_PROCESO_VALIDACION',
      validationComment: 'Validación en proceso, esperando documentación adicional',
      saleStatus: null,
      saleComment: null,
    },
  ];

  let clientsCreated = 0;
  for (const clientData of clientsData) {
    try {
      // Verificar si el cliente ya existe
      const existingClient = await prisma.client.findFirst({
        where: { numeroIdentificacion: clientData.numeroIdentificacion },
      });

      if (existingClient) {
        // Actualizar si existe
        await prisma.client.update({
          where: { id: existingClient.id },
          data: {
            ...clientData,
            tipoIdentificacion: clientData.tipoIdentificacion as any,
            validationStatus: clientData.validationStatus as any,
            saleStatus: clientData.saleStatus as any,
            createdBy: admin.id,
          },
        });
        console.log(`Cliente actualizado: ${clientData.nombres} ${clientData.apellidos}`);
      } else {
        // Crear si no existe
        const client = await prisma.client.create({
          data: {
            ...clientData,
            tipoIdentificacion: clientData.tipoIdentificacion as any,
            validationStatus: clientData.validationStatus as any,
            saleStatus: clientData.saleStatus as any,
            createdBy: admin.id,
          },
        });
        console.log(`Cliente creado: ${clientData.nombres} ${clientData.apellidos} - ${clientData.validationStatus}`);
        clientsCreated++;

        // Crear comentarios de estado para algunos clientes
        if (clientData.validationStatus === 'APROBADA' && clientData.saleStatus) {
          // Crear comentario de cambio de estado de validación
          await prisma.statusComment.create({
            data: {
              clientId: client.id,
              tipo: 'VALIDACION',
              estadoAnterior: 'EN_PROCESO_VALIDACION',
              estadoNuevo: 'APROBADA',
              comentario: clientData.validationComment || 'Cliente aprobado',
              createdBy: admin.id,
            },
          });

          // Crear comentario de cambio de estado de venta
          if (clientData.saleStatus === 'PENDIENTE_INSTALACION' || clientData.saleStatus === 'INSTALADA') {
            await prisma.statusComment.create({
              data: {
                clientId: client.id,
                tipo: 'VENTA',
                estadoAnterior: null,
                estadoNuevo: clientData.saleStatus,
                comentario: clientData.saleComment || 'Estado de venta actualizado',
                createdBy: admin.id,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error al crear cliente ${clientData.nombres} ${clientData.apellidos}:`, error);
    }
  }

  console.log('\n✅ Seed completado exitosamente');
  console.log(`   - 1 usuario admin creado`);
  console.log(`   - ${plans.length} planes de internet creados`);
  console.log(`   - ${clientsCreated} clientes nuevos creados`);
  console.log(`   - ${clientsData.length} clientes en total (incluyendo actualizados)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });