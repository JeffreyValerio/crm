import type { NextConfig } from "next";

// Nota: output: 'standalone' puede mostrar un warning en Windows con rutas largas que contienen espacios.
// Este es un bug conocido de Next.js. El build funciona correctamente, y en Docker (rutas sin espacios) no hay problema.
const nextConfig: NextConfig = {
  // Excluir Prisma del bundle de Turbopack: las importaciones dinámicas de
  // @prisma/client/runtime/* no están en el exports map del paquete y fallan
  // en build time. Con serverExternalPackages se dejan para Node.js en runtime.
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg'],
  output: process.env.SKIP_STANDALONE === 'true' ? undefined : 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;