"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";
import ContextualFAB from "@/components/ContextualFAB";
import ToastViewport from "@/components/ToastViewport";
import HeaderRuleLink from "@/components/HeaderRuleLink";
import HeaderUserBadge from "@/components/HeaderUserBadge";

const PUBLIC_PATHS = ["/login", "/register"];
const VERIFY_EMAIL_PATH = "/verify-email";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isVerifyEmailPath = pathname === VERIFY_EMAIL_PATH;
  const isPublic = PUBLIC_PATHS.includes(pathname) || isVerifyEmailPath;

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.replace("/login");
      return;
    }

    if (!loading && user && !user.emailVerified && !isVerifyEmailPath) {
      router.replace(VERIFY_EMAIL_PATH);
    }
  }, [user, loading, router, isPublic, isVerifyEmailPath]);

  if (isPublic) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-stone-50">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
      </div>
    );
  }

  if (!user) return null;
  if (!user.emailVerified) return null;

  return (
    <div className="min-h-svh flex flex-col">
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
  );
}
