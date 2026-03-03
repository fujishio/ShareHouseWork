"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, readJson } from "@/shared/lib/fetch-client";
import { isDataArrayResponse } from "@/shared/lib/response-guards";
import { formatJpDate, getGreeting } from "@/shared/lib/time";
import type { Member, UserListResponse } from "@/types";

export default function GreetingSection() {
  const { user } = useAuth();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/users")
      .then((res) => readJson<UserListResponse>(res, isDataArrayResponse<Member>))
      .then((data) => {
        const me = data.data.find((u) => u.id === user.uid);
        if (me) setName(me.name);
      })
      .catch(() => {});
  }, [user]);

  return (
    <div className="pt-1">
      <p className="text-stone-400 text-sm">{formatJpDate()}</p>
      <h2 className="text-xl font-bold text-stone-800 mt-0.5">
        {getGreeting()}、{name ?? "…"}さん
      </h2>
    </div>
  );
}
