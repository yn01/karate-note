import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // ノートの写真（ブラウザで縮めてから送る）。Vercel の上限 4.5MB より下にする
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  // トップは道場生ホームへ（デモの入口）
  async redirects() {
    return [{ source: "/", destination: "/student", permanent: false }];
  },
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
