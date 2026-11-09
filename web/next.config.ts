import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 루트는 출석부 단일 페이지(public/attendance.html)로 서빙
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/attendance.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
  cacheComponents: true,
  partialPrefetching: true,
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
