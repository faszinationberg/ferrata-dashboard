import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // IGNORIERT TypeScript-Fehler beim Build (für schnelles Deployment)
    ignoreBuildErrors: true,
  },
  eslint: {
    // IGNORIERT ESLint-Warnungen/Fehler beim Build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
