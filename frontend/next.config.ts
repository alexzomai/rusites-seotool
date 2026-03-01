import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.liveinternet.ru" },
    ],
  },
};

export default nextConfig;
