import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the whole app is HTML/CSS/JS plus static JSON in /public/data.
  // There is no server, no database and no runtime API call.
  output: "export",
  images: { unoptimized: true },
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
