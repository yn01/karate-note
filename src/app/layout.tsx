import type { Metadata, Viewport } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import { Suspense } from "react";
import { RoleSwitcher, RoleSwitcherFallback } from "@/components/RoleSwitcher";
import "./globals.css";

const zenMaru = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  weight: ["400", "500", "700"],
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
  themeColor: "#1e3a5f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${zenMaru.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <header className="sticky top-0 z-10 bg-ink text-white shadow">
          <p className="bg-amber-300 py-1 text-center text-xs font-bold text-ink">
            架空のデータです（デモ）
          </p>
          <Suspense fallback={<RoleSwitcherFallback />}>
            <RoleSwitcher />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-10">{children}</main>
      </body>
    </html>
  );
}
