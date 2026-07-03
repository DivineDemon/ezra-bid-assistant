import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ezra/shared"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
