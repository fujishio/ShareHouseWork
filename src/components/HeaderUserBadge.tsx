"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const PUBLIC_PATHS = ["/login", "/register"];

function getUserInitial(user: { displayName?: string | null; email?: string | null }): string {
  const source = (user.displayName ?? user.email ?? "").trim();
  if (!source) return "?";
  return source.charAt(0).toUpperCase();
}

export default function HeaderUserBadge() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (PUBLIC_PATHS.includes(pathname)) return null;
  if (loading) return null;
  if (!user) return null;

  const initial = getUserInitial(user);

  return (
    <div
      className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-600 to-stone-800 flex items-center justify-center text-sm font-medium text-amber-300 shadow-sm"
      aria-label="ユーザーアイコン"
      title={user.displayName ?? user.email ?? ""}
    >
      {initial}
    </div>
  );
}
