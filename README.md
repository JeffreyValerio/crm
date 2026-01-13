# CRM

Aplicación CRM desarrollada con Next.js, Tailwind CSS, Prisma y Docker.

## Requisitos

- Node.js 22+
- Docker y Docker Compose

## Configuración

1. Clonar el repositorio
2. Copiar `.env.example` a `.env` y configurar las variables de entorno:
   - `DATABASE_URL`: URL de conexión a PostgreSQL
   - `SESSION_SECRET`: Clave secreta para sesiones (al menos 32 caracteres)
   - `NEXT_PUBLIC_URL`: URL pública de la aplicación (ej: http://localhost:3000)
   - **Opcional - Configuración SMTP para correos:**
     - `SMTP_HOST`: Servidor SMTP (ej: smtp.gmail.com)
     - `SMTP_PORT`: Puerto SMTP (ej: 587)
     - `SMTP_SECURE`: true para SSL (465) o false para TLS (587)
     - `SMTP_USER`: Email para autenticación SMTP
     - `SMTP_PASSWORD`: Contraseña o App Password para SMTP
     - `SMTP_FROM_NAME`: Nombre del remitente (opcional, por defecto "CRM")
   - **Configuración Cloudinary para imágenes:**
     - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`: Nombre de la nube de Cloudinary (ej: dcv0ebwbf)
     - `CLOUDINARY_API_KEY`: API Key de Cloudinary
     - `CLOUDINARY_API_SECRET`: API Secret de Cloudinary
3. Instalar dependencias: `npm install`
4. Iniciar PostgreSQL con Docker: `docker-compose up -d`
5. Generar cliente de Prisma: `npm run db:generate`
6. Sincronizar esquema con la base de datos: `npm run db:push`
7. Ejecutar seed para crear usuario admin: `npm run db:seed`
8. Correr el proyecto en desarrollo: `npm run dev`

## Usuario por defecto

- Email: `admin@admin.com`
- Contraseña: `admin`

## Scripts disponibles

- `npm run dev`: Inicia el servidor de desarrollo
- `npm run build`: Construye la aplicación para producción (incluye generación de Prisma y creación de tablas)
- `npm run start`: Inicia el servidor de producción
- `npm run db:generate`: Genera el cliente de Prisma
- `npm run db:push`: Sincroniza el esquema con la base de datos
- `npm run db:deploy`: Genera Prisma y crea/actualiza tablas (útil para producción)
- `npm run db:migrate`: Ejecuta migraciones
- `npm run db:seed`: Ejecuta el seed para poblar datos iniciales

## Despliegue en Vercel

El proyecto está configurado para crear automáticamente las tablas de Prisma durante el build en Vercel. Asegúrate de configurar la variable de entorno `DATABASE_URL` en Vercel con la URL de tu base de datos PostgreSQL.

## Características

- Gestión de clientes con fotos (cédula frontal, cédula trasera y selfie)
- Gestión de tipos de producto y productos
- Sistema de estados de validación y venta
- Comentarios de estado con historial
- Descarga de fotos como PDF
- Integración con Cloudinary para almacenamiento de imágenes
- Modo oscuro
- Sistema de invitaciones por correo electrónico
