import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  experimental: {
    staleTimes: {
      dynamic: process.env.NODE_ENV === "development" ? 0 : undefined, // 動的ページのキャッシュ時間を0に
      static: process.env.NODE_ENV === "development" ? 0 : undefined, // 静的ページのキャッシュ時間を0に
    },
  },
};

export default nextConfig;
