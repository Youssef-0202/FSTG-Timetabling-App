import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* @ts-ignore - Turbopack option */
  allowedDevOrigins: ['192.168.56.1'],
};

export default nextConfig;
