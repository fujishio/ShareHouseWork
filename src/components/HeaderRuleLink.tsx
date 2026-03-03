"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function HeaderRuleLink() {
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
