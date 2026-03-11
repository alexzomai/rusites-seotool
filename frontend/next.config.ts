import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

const DOMAIN = process.env.DOMAIN;

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  ...(DOMAIN && { allowedDevOrigins: [DOMAIN] }),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.liveinternet.ru" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
