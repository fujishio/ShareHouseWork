"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";

const PUBLIC_PATHS = ["/login", "/register"];

export default function HeaderRuleLink() {
  const pathname = usePathname();

  if (PUBLIC_PATHS.includes(pathname)) {
    return null;
  }

  return (
    <Link
      href="/rules"
      aria-label="ハウスルール"
      className="flex flex-col items-center justify-center text-stone-400 hover:text-amber-600 transition-colors"
    >
      <BookOpen size={16} strokeWidth={1.5} />
      <span className="text-[9px] font-medium leading-tight mt-0.5">ルール</span>
    </Link>
  );
}
