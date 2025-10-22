import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'spasxtbjvsdlbhgaqivw.supabase.co', // Producción
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'qxzskrykwzqgzqsihpjh.supabase.co', // Staging ← AGREGAR ESTO
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;