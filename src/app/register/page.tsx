"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase-client";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft } from "lucide-react";
import { apiFetch, readJson } from "@/shared/lib/fetch-client";
import { isApiErrorBody } from "@/shared/lib/response-guards";
import AppLogo from "@/components/AppLogo";
import ColorPicker from "@/components/ColorPicker";
import FormInput from "@/components/FormInput";
import PasswordInput from "@/components/PasswordInput";
import { PRESET_COLORS } from "@/shared/constants/house";
import type { PresetColor } from "@/shared/constants/house";

const DEFAULT_COLOR = PRESET_COLORS[0];

type Mode = "create" | "join";

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await readJson<{ error?: string }>(response, isApiErrorBody);
    if (
      typeof body.error === "string" &&
      body.error
    ) {
      return body.error;
    }
  } catch {
    // ignore parse error
  }
  return "登録に失敗しました";
}

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const justRegistered = useRef(false);

  const [mode, setMode] = useState<Mode | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [color, setColor] = useState<PresetColor>(DEFAULT_COLOR);
  const [houseName, setHouseName] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && !justRegistered.current) router.replace("/");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-svh bg-stone-50 flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
      </div>
    );
  }

  const createUser = async (uid: string) => {
    const res = await apiFetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, email, name, color }),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res));
  };

  const createHouse = async (uid: string) => {
    const res = await apiFetch("/api/houses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: houseName, ownerUid: uid, joinPassword }),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res));
  };

  const joinHouse = async (uid: string) => {
    const res = await apiFetch("/api/houses/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ houseName, joinPassword, userUid: uid }),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("パスワードが一致しません");
      return;
    }

    setSubmitting(true);
    justRegistered.current = true;

    try {
      const authResult = await createUserWithEmailAndPassword(
        getClientAuth(),
        email,
        password
      );
      const uid = authResult.user.uid;

      await createUser(uid);
      if (mode === "create") {
        await createHouse(uid);
      } else {
        await joinHouse(uid);
      }

      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === null) {
    return (
      <div className="min-h-svh bg-stone-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <AppLogo />
          <div className="space-y-3">
            <button
              onClick={() => setMode("create")}
              className="w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-5 text-left hover:border-amber-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-stone-800 text-sm">新しいハウスを作る</p>
                  <p className="text-xs text-stone-500 mt-0.5">ハウスを立ち上げてメンバーを招待する</p>
                </div>
                <span className="text-stone-400 text-lg">→</span>
              </div>
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-5 text-left hover:border-amber-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-stone-800 text-sm">既存のハウスに参加する</p>
                  <p className="text-xs text-stone-500 mt-0.5">合言葉でハウスに入る</p>
                </div>
                <span className="text-stone-400 text-lg">→</span>
              </div>
            </button>
            <p className="text-xs text-stone-500 text-center pt-2">
              既存アカウントは{" "}
              <Link href="/login" className="text-amber-700 underline hover:text-amber-800">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-stone-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <AppLogo />
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-md border border-stone-200 p-6 space-y-4"
        >
          <button
            type="button"
            onClick={() => setMode(null)}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 transition-colors"
          >
            <ArrowLeft size={14} />
            戻る
          </button>

          <div className="border-t border-stone-100 pt-3 space-y-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              あなたの情報
            </p>
            <FormInput
              label="表示名"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="田中 太郎"
            />
            <FormInput
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="example@email.com"
            />
            <PasswordInput
              label="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="6文字以上"
            />
            <PasswordInput
              label="パスワード確認"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="パスワードを再入力"
            />
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">テーマカラー</label>
              <ColorPicker value={color} onChange={setColor} />
              <p className="mt-1.5 text-xs text-stone-400">プロフィール表示に使用されます</p>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-3 space-y-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              ハウス情報
            </p>
            <FormInput
              label="ハウス名"
              type="text"
              value={houseName}
              onChange={(e) => setHouseName(e.target.value)}
              required
              placeholder="我が家"
            />
            <FormInput
              label="合言葉"
              type="text"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              required
              placeholder={
                mode === "create"
                  ? "メンバーが参加する際に使う合言葉"
                  : "ホストから教わった合言葉"
              }
              hint={
                mode === "create"
                  ? "ハウスに招待するときにメンバーへ共有してください"
                  : "ホストから教わった合言葉を入力してください"
              }
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-amber-300 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
          >
            {submitting
              ? "登録中..."
              : mode === "create"
              ? "ハウスを作って登録する"
              : "参加して登録する"}
          </button>
        </form>
      </div>
    </div>
  );
}
