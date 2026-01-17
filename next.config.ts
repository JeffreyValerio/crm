import type { NextConfig } from "next";

// Nota: output: 'standalone' puede mostrar un warning en Windows con rutas largas que contienen espacios.
// Este es un bug conocido de Next.js. El build funciona correctamente, y en Docker (rutas sin espacios) no hay problema.
const nextConfig: NextConfig = {
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