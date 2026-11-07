import type { Metadata, Viewport } from "next";
import { Shippori_Mincho_B1, Zen_Kaku_Gothic_New } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { RoleSwitcher, RoleSwitcherFallback } from "@/components/RoleSwitcher";
import "./globals.css";

// 日本語のフォントは大きいので先読みしない
const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  weight: ["400", "700"],
  subsets: ["latin"],
  preload: false,
});
const shippori = Shippori_Mincho_B1({
  variable: "--font-shippori",
  weight: ["800"],
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "空手ノート",
  description: "道場生・保護者・先生をつなぐ空手ノート（デモ・架空のデータ）",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#22252b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${zenKaku.variable} ${shippori.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-washi text-sumi">
        {/* ふりがなの設定を、Next.js のコードより先に入れる（「なし」のときに読みが一瞬出るのを防ぐ） */}
        <Script id="furigana-setting" strategy="beforeInteractive">
          {`try{if(localStorage.getItem("karate-note:furigana")==="off")document.documentElement.dataset.furigana="off"}catch(e){}`}
        </Script>
        <header className="sticky top-0 z-10 bg-sumi text-white">
          <p className="bg-kinari py-1 text-center text-xs font-bold text-muted">デモ用の架空のデータです</p>
          <Suspense fallback={<RoleSwitcherFallback />}>
            <RoleSwitcher />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-md flex-1 px-4 pt-5 pb-12">{children}</main>
      </body>
    </html>
  );
}
