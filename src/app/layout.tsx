import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ContextualFAB from "@/components/ContextualFAB";
import ToastViewport from "@/components/ToastViewport";
import { AuthProvider } from "@/context/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import HeaderRuleLink from "@/components/HeaderRuleLink";
import HeaderUserBadge from "@/components/HeaderUserBadge";

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
    <html lang="ja">
      <body className="bg-stone-50 text-stone-900">
        <AuthProvider>
          <AuthGuard>
            <div className="min-h-screen flex flex-col">
              <header className="bg-white/80 backdrop-blur-md border-b border-stone-200/60 fixed inset-x-0 top-0 z-30">
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
                    <HeaderRuleLink />
                    <HeaderUserBadge />
                  </div>
                </div>
              </header>
              <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-[4.5rem] pb-24">
                {children}
              </main>
              <ToastViewport />
              <ContextualFAB />
              <BottomNav />
            </div>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
