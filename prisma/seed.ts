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
  console.log('🗑️  Eliminando todos los datos existentes...');
  
  // Eliminar en orden para respetar foreign keys
  await prisma.statusComment.deleteMany({});
  console.log('   ✓ StatusComments eliminados');
  
  await prisma.advance.deleteMany({});
  console.log('   ✓ Advances eliminados');
  
  await prisma.payroll.deleteMany({});
  console.log('   ✓ Payrolls eliminados');
  
  await prisma.client.deleteMany({});
  console.log('   ✓ Clients eliminados');
  
  await prisma.plan.deleteMany({});
  console.log('   ✓ Plans eliminados');
  
  await prisma.productType.deleteMany({});
  console.log('   ✓ ProductTypes eliminados');
  
  await prisma.user.deleteMany({});
  console.log('   ✓ Users eliminados');
  
  console.log('✅ Todos los datos eliminados\n');
  
  console.log('🔨 Reconstruyendo datos...\n');
  
  // Crear usuario admin
  const hashedPassword = await bcrypt.hash('admin', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@admin.com',
      password: hashedPassword,
      nombre: 'Jeffrey',
      apellidos: 'Valerio',
      role: 'admin',
    },
  });

  console.log('Usuario admin creado:', admin);

  // Crear vendedores
  const hashedPasswordVendedor = await bcrypt.hash('vendedor123', 10);
  const vendedores = [
    {
      email: 'carlos.mendez@crm.com',
      password: hashedPasswordVendedor,
      nombre: 'Carlos',
      apellidos: 'Méndez',
      role: 'user',
    },
    {
      email: 'ana.rodriguez@crm.com',
      password: hashedPasswordVendedor,
      nombre: 'Ana',
      apellidos: 'Rodríguez',
      role: 'user',
    },
    {
      email: 'luis.gonzalez@crm.com',
      password: hashedPasswordVendedor,
      nombre: 'Luis',
      apellidos: 'González',
      role: 'user',
    },
    {
      email: 'maria.sanchez@crm.com',
      password: hashedPasswordVendedor,
      nombre: 'María',
      apellidos: 'Sánchez',
      role: 'user',
    },
  ];

  const vendedoresCreados = [];
  for (const vendedorData of vendedores) {
    const vendedor = await prisma.user.create({
      data: vendedorData,
    });
    vendedoresCreados.push(vendedor);
    console.log(`Vendedor creado: ${vendedorData.nombre} ${vendedorData.apellidos}`);
  }

  // Crear tipos de producto
  const internetType = await prisma.productType.create({
    data: {
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
    const plan = await prisma.plan.create({
      data: {
        ...planData,
        productTypeId: internetType.id,
      },
    });
    console.log(`Plan creado: ${plan.nombre}`);
  }

  // Obtener todos los planes creados para asignarlos a clientes
  const allPlans = await prisma.plan.findMany();
  const planIds = allPlans.map(p => p.id);

  // Función auxiliar para obtener fecha en un mes específico
  function getDateForMonth(year: number, month: number, day: number): Date {
    return new Date(year, month - 1, day);
  }

  // Obtener fecha actual
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Crear clientes de ejemplo con diferentes estados y fechas
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

  // Clientes con fechas y vendedores asignados
  const clientsWithDates = [
    // Noviembre 2024 - Vendedor 1 (Carlos)
    { ...clientsData[0], createdAt: getDateForMonth(2024, 11, 5), vendedorIndex: 0 },
    { ...clientsData[1], createdAt: getDateForMonth(2024, 11, 12), vendedorIndex: 0 },
    { ...clientsData[2], createdAt: getDateForMonth(2024, 11, 18), vendedorIndex: 0 },
    
    // Diciembre 2024 - Vendedor 2 (Ana)
    { ...clientsData[3], createdAt: getDateForMonth(2024, 12, 3), vendedorIndex: 1 },
    { ...clientsData[4], createdAt: getDateForMonth(2024, 12, 10), vendedorIndex: 1 },
    { ...clientsData[5], createdAt: getDateForMonth(2024, 12, 15), vendedorIndex: 1 },
    
    // Enero 2025 - Vendedor 3 (Luis)
    { ...clientsData[6], createdAt: getDateForMonth(2025, 1, 8), vendedorIndex: 2 },
    { ...clientsData[7], createdAt: getDateForMonth(2025, 1, 15), vendedorIndex: 2 },
    { ...clientsData[8], createdAt: getDateForMonth(2025, 1, 22), vendedorIndex: 2 },
    
    // Febrero 2025 - Vendedor 4 (María)
    { ...clientsData[9], createdAt: getDateForMonth(2025, 2, 2), vendedorIndex: 3 },
  ];

  // Agregar más clientes con diferentes estados y meses
  const additionalClients = [
    // Noviembre - Más ventas instaladas
    {
      nombres: 'Roberto',
      apellidos: 'Vargas Solís',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '8-8901-2345',
      email: 'roberto.vargas@email.com',
      telefono: '8888-0123',
      provincia: 'San José',
      canton: 'Desamparados',
      distrito: 'Desamparados',
      senasExactas: 'Barrio San Rafael, calle principal',
      coordenadasLat: '9.9000',
      coordenadasLng: '-84.0667',
      numeroMedidor: 'MED-008901',
      planId: planIds[2],
      validationStatus: 'APROBADA',
      validationComment: 'Cliente aprobado',
      saleStatus: 'INSTALADA',
      saleComment: 'Instalación completada',
      createdAt: getDateForMonth(2024, 11, 25),
      vendedorIndex: 0,
    },
    {
      nombres: 'Carmen',
      apellidos: 'López Martínez',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '9-9012-3456',
      email: 'carmen.lopez@email.com',
      telefono: '8888-1234',
      provincia: 'Alajuela',
      canton: 'San Ramón',
      distrito: 'San Ramón',
      senasExactas: 'Avenida Central, frente al parque',
      coordenadasLat: '10.0833',
      coordenadasLng: '-84.4667',
      numeroMedidor: 'MED-009012',
      planId: planIds[3],
      validationStatus: 'APROBADA',
      validationComment: 'Cliente aprobado',
      saleStatus: 'INSTALADA',
      saleComment: 'Instalación completada',
      createdAt: getDateForMonth(2024, 11, 28),
      vendedorIndex: 0,
    },
    
    // Diciembre - Más ventas
    {
      nombres: 'Fernando',
      apellidos: 'Castro Rojas',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '1-0123-4567',
      email: 'fernando.castro@email.com',
      telefono: '8888-2345',
      provincia: 'Cartago',
      canton: 'La Unión',
      distrito: 'San Diego',
      senasExactas: 'Condominio Las Flores, casa #12',
      coordenadasLat: '9.9167',
      coordenadasLng: '-83.9833',
      numeroMedidor: 'MED-010123',
      planId: planIds[4],
      validationStatus: 'APROBADA',
      validationComment: 'Cliente aprobado',
      saleStatus: 'INSTALADA',
      saleComment: 'Instalación completada',
      createdAt: getDateForMonth(2024, 12, 20),
      vendedorIndex: 1,
    },
    {
      nombres: 'Patricia',
      apellidos: 'Morales Chaves',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '1-1234-5678',
      email: 'patricia.morales@email.com',
      telefono: '8888-3456',
      provincia: 'Heredia',
      canton: 'Belén',
      distrito: 'Belén',
      senasExactas: 'Barrio El Carmen, calle 3',
      coordenadasLat: '9.9833',
      coordenadasLng: '-84.1833',
      numeroMedidor: 'MED-011234',
      planId: planIds[1],
      validationStatus: 'APROBADA',
      validationComment: 'Cliente aprobado',
      saleStatus: 'PENDIENTE_INSTALACION',
      saleComment: 'Agendada instalación',
      createdAt: getDateForMonth(2024, 12, 22),
      vendedorIndex: 1,
    },
    {
      nombres: 'Jorge',
      apellidos: 'Herrera Umaña',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '1-2345-6789',
      email: 'jorge.herrera@email.com',
      telefono: '8888-4567',
      provincia: 'San José',
      canton: 'Escazú',
      distrito: 'Escazú',
      senasExactas: 'Condominio Los Yoses, torre 1, apto 201',
      coordenadasLat: '9.9186',
      coordenadasLng: '-84.1400',
      numeroMedidor: 'MED-012345',
      planId: planIds[5],
      validationStatus: 'APROBADA',
      validationComment: 'Cliente aprobado',
      saleStatus: 'INSTALADA',
      saleComment: 'Instalación completada',
      createdAt: getDateForMonth(2024, 12, 28),
      vendedorIndex: 1,
    },
    
    // Enero 2025 - Más ventas
    {
      nombres: 'Gabriela',
      apellidos: 'Soto Ramírez',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '1-3456-7890',
      email: 'gabriela.soto@email.com',
      telefono: '8888-5678',
      provincia: 'Puntarenas',
      canton: 'Esparza',
      distrito: 'Esparza',
      senasExactas: 'Avenida Central, frente al parque',
      coordenadasLat: '9.9833',
      coordenadasLng: '-84.6667',
      numeroMedidor: 'MED-013456',
      planId: planIds[2],
      validationStatus: 'APROBADA',
      validationComment: 'Cliente aprobado',
      saleStatus: 'INSTALADA',
      saleComment: 'Instalación completada',
      createdAt: getDateForMonth(2025, 1, 5),
      vendedorIndex: 2,
    },
    {
      nombres: 'Ricardo',
      apellidos: 'Jiménez Fernández',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '1-4567-8901',
      email: 'ricardo.jimenez@email.com',
      telefono: '8888-6789',
      provincia: 'Guanacaste',
      canton: 'Cañas',
      distrito: 'Cañas',
      senasExactas: 'Barrio El Carmen, calle principal',
      coordenadasLat: '10.4333',
      coordenadasLng: '-85.1000',
      numeroMedidor: 'MED-014567',
      planId: planIds[3],
      validationStatus: 'APROBADA',
      validationComment: 'Cliente aprobado',
      saleStatus: 'INSTALADA',
      saleComment: 'Instalación completada',
      createdAt: getDateForMonth(2025, 1, 12),
      vendedorIndex: 2,
    },
    {
      nombres: 'Sandra',
      apellidos: 'Vega Mora',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '1-5678-9012',
      email: 'sandra.vega@email.com',
      telefono: '8888-7890',
      provincia: 'Limón',
      canton: 'Siquirres',
      distrito: 'Siquirres',
      senasExactas: 'Avenida Central, frente al parque',
      coordenadasLat: '10.1000',
      coordenadasLng: '-83.5167',
      numeroMedidor: 'MED-015678',
      planId: planIds[4],
      validationStatus: 'APROBADA',
      validationComment: 'Cliente aprobado',
      saleStatus: 'PENDIENTE_INSTALACION',
      saleComment: 'Agendada instalación',
      createdAt: getDateForMonth(2025, 1, 18),
      vendedorIndex: 2,
    },
    {
      nombres: 'Mario',
      apellidos: 'Brenes Castro',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '1-6789-0123',
      email: 'mario.brenes@email.com',
      telefono: '8888-8901',
      provincia: 'San José',
      canton: 'Santa Ana',
      distrito: 'Santa Ana',
      senasExactas: 'Condominio Las Flores, casa #8',
      coordenadasLat: '9.9333',
      coordenadasLng: '-84.1833',
      numeroMedidor: 'MED-016789',
      planId: planIds[6],
      validationStatus: 'APROBADA',
      validationComment: 'Cliente aprobado',
      saleStatus: 'INSTALADA',
      saleComment: 'Instalación completada',
      createdAt: getDateForMonth(2025, 1, 25),
      vendedorIndex: 2,
    },
    
    // Febrero 2025 - Vendedor 4
    {
      nombres: 'Alejandra',
      apellidos: 'Rojas González',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '1-7890-1234',
      email: 'alejandra.rojas@email.com',
      telefono: '8888-9012',
      provincia: 'Alajuela',
      canton: 'Grecia',
      distrito: 'Grecia',
      senasExactas: 'Barrio El Carmen, calle principal',
      coordenadasLat: '10.0667',
      coordenadasLng: '-84.3167',
      numeroMedidor: 'MED-017890',
      planId: planIds[1],
      validationStatus: 'APROBADA',
      validationComment: 'Cliente aprobado',
      saleStatus: 'INSTALADA',
      saleComment: 'Instalación completada',
      createdAt: getDateForMonth(2025, 2, 1),
      vendedorIndex: 3,
    },
    {
      nombres: 'Andrés',
      apellidos: 'Mora Sánchez',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '1-8901-2345',
      email: 'andres.mora@email.com',
      telefono: '8888-0123',
      provincia: 'Cartago',
      canton: 'Turrialba',
      distrito: 'Turrialba',
      senasExactas: 'Avenida Central, frente al parque',
      coordenadasLat: '9.9000',
      coordenadasLng: '-83.6833',
      numeroMedidor: 'MED-018901',
      planId: planIds[3],
      validationStatus: 'APROBADA',
      validationComment: 'Cliente aprobado',
      saleStatus: 'INSTALADA',
      saleComment: 'Instalación completada',
      createdAt: getDateForMonth(2025, 2, 5),
      vendedorIndex: 3,
    },
  ];

  const allClientsData = [...clientsWithDates, ...additionalClients];

  let clientsCreated = 0;
  for (const clientData of allClientsData) {
    try {
      const vendedorId = clientData.vendedorIndex !== undefined 
        ? vendedoresCreados[clientData.vendedorIndex].id 
        : admin.id;
      
      const { vendedorIndex, createdAt, ...clientDataClean } = clientData;
      
      // Crear cliente
      const client = await prisma.client.create({
        data: {
          ...clientDataClean,
          tipoIdentificacion: clientDataClean.tipoIdentificacion as any,
          validationStatus: clientDataClean.validationStatus as any,
          saleStatus: clientDataClean.saleStatus as any,
          createdBy: vendedorId,
          createdAt: createdAt,
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
    } catch (error) {
      console.error(`Error al crear cliente ${clientData.nombres} ${clientData.apellidos}:`, error);
    }
  }

  console.log('\n✅ Seed completado exitosamente');
  console.log(`   - 1 usuario admin creado`);
  console.log(`   - ${vendedoresCreados.length} vendedores creados`);
  console.log(`   - 1 tipo de producto creado`);
  console.log(`   - ${plans.length} planes de internet creados`);
  console.log(`   - ${clientsCreated} clientes creados (distribuidos en diferentes meses)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });