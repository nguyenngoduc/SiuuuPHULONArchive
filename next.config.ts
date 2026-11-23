import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return {
      fallback: [
        {
          source: "/files/:path*",
          destination: "/api/files/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
