"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase-client";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/shared/lib/fetch-client";

const DEFAULT_COLOR = "#d97706";

type Mode = "create" | "join";

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) return body.error;
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
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [houseName, setHouseName] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && !justRegistered.current) router.replace("/");
  }, [user, loading, router]);

  if (loading) return null;

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

      const userRes = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, email, name, color }),
      });
      if (!userRes.ok) {
        setError(await readErrorMessage(userRes));
        return;
      }

      if (mode === "create") {
        const houseRes = await apiFetch("/api/houses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: houseName, ownerUid: uid, joinPassword }),
        });
        if (!houseRes.ok) {
          setError(await readErrorMessage(houseRes));
          return;
        }
      } else {
        const joinRes = await apiFetch("/api/houses/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ houseName, joinPassword, userUid: uid }),
        });
        if (!joinRes.ok) {
          setError(await readErrorMessage(joinRes));
          return;
        }
      }

      router.replace("/");
    } catch {
      setError("登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const Logo = () => (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-2 mb-2">
        <div className="w-9 h-9 bg-stone-800 rounded-xl flex items-center justify-center">
          <span className="text-amber-400 text-sm font-bold">S</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-800">
          Share<span className="text-amber-600">House</span>
        </h1>
      </div>
      <p className="text-sm text-stone-500">シェアハウス生活管理</p>
    </div>
  );

  if (mode === null) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <Logo />
          <div className="space-y-3">
            <button
              onClick={() => setMode("create")}
              className="w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-5 text-left hover:border-amber-300 hover:shadow transition-all"
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
              className="w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-5 text-left hover:border-amber-300 hover:shadow transition-all"
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
              <Link href="/login" className="text-amber-700 underline">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <Logo />
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4"
        >
          <button
            type="button"
            onClick={() => setMode(null)}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700"
          >
            <ArrowLeft size={14} />
            戻る
          </button>

          <div className="border-t border-stone-100 pt-3 space-y-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              あなたの情報
            </p>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">表示名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                placeholder="田中 太郎"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">パスワード</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  placeholder="6文字以上"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">パスワード確認</label>
              <div className="relative">
                <input
                  type={showPasswordConfirm ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  placeholder="パスワードを再入力"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  aria-label={showPasswordConfirm ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">テーマカラー</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-14 border border-stone-200 rounded-lg cursor-pointer"
                />
                <span className="text-xs text-stone-500">プロフィール表示に使用されます</span>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-3 space-y-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              ハウス情報
            </p>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">ハウス名</label>
              <input
                type="text"
                value={houseName}
                onChange={(e) => setHouseName(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                placeholder="我が家"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">合言葉</label>
              <input
                type="text"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                placeholder={
                  mode === "create"
                    ? "メンバーが参加する際に使う合言葉"
                    : "ホストから教わった合言葉"
                }
              />
              <p className="text-xs text-stone-400 mt-1">
                {mode === "create"
                  ? "ハウスに招待するときにメンバーへ共有してください"
                  : "ホストから教わった合言葉を入力してください"}
              </p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
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
