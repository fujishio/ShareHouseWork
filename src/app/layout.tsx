import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ContextualFAB from "@/components/ContextualFAB";
import ToastViewport from "@/components/ToastViewport";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ShareHouseWork",
  description: "シェアハウス生活管理アプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={notoSansJP.className}>
      <body className="bg-stone-50 text-stone-900">
        <div className="min-h-screen flex flex-col">
          <header className="bg-white/80 backdrop-blur-md border-b border-stone-200/60 sticky top-0 z-10">
            <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-stone-800 rounded-lg flex items-center justify-center">
                  <span className="text-amber-400 text-xs font-bold">S</span>
                </div>
                <h1 className="text-lg font-bold text-stone-800">
                  Share<span className="text-amber-600">House</span>
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/rules"
                  aria-label="ハウスルール"
                  className="flex flex-col items-center justify-center text-stone-400 hover:text-amber-600 transition-colors"
                >
                  <BookOpen size={16} strokeWidth={1.5} />
                  <span className="text-[9px] font-medium leading-tight mt-0.5">ルール</span>
                </Link>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-600 to-stone-800 flex items-center justify-center text-sm font-medium text-amber-300 shadow-sm">
                  家
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24">
            {children}
          </main>
          <ToastViewport />
          <ContextualFAB />
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
