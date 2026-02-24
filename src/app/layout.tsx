import type { Metadata } from "next";
import "./globals.css";

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
      <body className="bg-gray-50 text-gray-900">
        <div className="min-h-screen flex flex-col">
          <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
              <h1 className="text-lg font-bold text-emerald-600">ShareHouseWork</h1>
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-medium text-emerald-700">
                あ
              </div>
            </div>
          </header>
          <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-24">
            {children}
          </main>
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
            <div className="max-w-2xl mx-auto flex">
              {[
                { href: "/", label: "ホーム", icon: "🏠" },
                { href: "/tasks", label: "家事", icon: "✅" },
                { href: "/expenses", label: "費用", icon: "💰" },
                { href: "/shopping", label: "買い物", icon: "🛒" },
                { href: "/notices", label: "お知らせ", icon: "📢" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex-1 flex flex-col items-center py-2 text-xs text-gray-500 hover:text-emerald-600"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </nav>
        </div>
      </body>
    </html>
  );
}
