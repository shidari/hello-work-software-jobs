import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: process.env.NODE_ENV === "development" ? 0 : undefined,
      static: process.env.NODE_ENV === "development" ? 0 : undefined,
    },
  },
};

export default nextConfig;
