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
    "/coach/review": ["./skills/**/*.md"],
    // 形の見比べ：先生の知見、手本の写真、見本の練習の写真
    "/parent": ["./skills/**/*.md", "./public/kata/**/*.jpg", "./public/samples/practice-heian-nidan-01.jpg"],
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
