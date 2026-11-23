import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [{
      source: "/thumbnails/:file",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }];
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
