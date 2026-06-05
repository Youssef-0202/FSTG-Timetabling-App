import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* @ts-ignore - Turbopack option */
  allowedDevOrigins: ['192.168.56.1'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
};

export default nextConfig;
