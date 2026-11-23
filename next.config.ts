import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Matches the 4.5 MB request limit of the hosting platform; bigger files will use direct-to-storage uploads.
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
