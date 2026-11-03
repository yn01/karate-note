import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // ノートの写真（ブラウザで縮めてから送る）。Vercel の上限 4.5MB より下にする
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  // 見本のノート画像はサーバーでも読む（public は CDN 配信なので、関数に入れておく）
  outputFileTracingIncludes: {
    "/student/note": ["./public/samples/sample-note-11-01.png"],
    // 指導者の知見（skills）をプロンプトに読み込む
    "/student/question": ["./skills/**/*.md"],
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
