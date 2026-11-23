import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: "/files/:path*",
        destination:
          "https://raw.githubusercontent.com/nguyenngoduc/SiuuuPHULONArchive/main/public/files/:path*",
      },
    ];
  },
};

export default nextConfig;
