import type { Metadata, Viewport } from "next";
import { Shippori_Mincho_B1, Zen_Kaku_Gothic_New } from "next/font/google";
import { Suspense } from "react";
import { RoleSwitcher, RoleSwitcherFallback } from "@/components/RoleSwitcher";
import "./globals.css";

// 日本語のフォントは大きいので先読みしない
const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
});
const shippori = Shippori_Mincho_B1({
  variable: "--font-shippori",
  weight: ["600", "800"],
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "空手ノート",
  description: "道場生・保護者・指導者をつなぐ空手ノート（デモ・架空のデータ）",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#22252b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${zenKaku.variable} ${shippori.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-washi text-sumi">
        <header className="sticky top-0 z-10 bg-sumi text-white">
          <p className="bg-kinari py-1 text-center text-xs font-bold text-muted">架空のデータです（デモ）</p>
          <Suspense fallback={<RoleSwitcherFallback />}>
            <RoleSwitcher />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-md flex-1 px-4 pt-5 pb-12">{children}</main>
      </body>
    </html>
  );
}
