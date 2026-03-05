"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase-client";
import { useAuth } from "@/context/AuthContext";
import AppLogo from "@/components/AppLogo";
import FormInput from "@/components/FormInput";
import PasswordInput from "@/components/PasswordInput";

function toLoginErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code === "auth/network-request-failed") {
      return "ネットワーク接続に失敗しました。エミュレーター起動とブラウザ接続を確認してください";
    }
    if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
      return "メールアドレスまたはパスワードが正しくありません";
    }
  }
  return "ログインに失敗しました";
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.emailVerified ? "/" : "/verify-email");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-svh bg-stone-50 flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const credential = await signInWithEmailAndPassword(getClientAuth(), email, password);
      await credential.user.reload();
      if (!credential.user.emailVerified) {
        await signOut(getClientAuth());
        setError("メール認証が未完了です。受信メールのリンクを開いてからログインしてください");
        return;
      }
      const token = await credential.user.getIdToken();
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      router.replace("/");
    } catch (err) {
      setError(toLoginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-svh bg-stone-50 flex items-center justify-center px-4 overflow-hidden">
      <div className="w-full max-w-sm">
        <AppLogo />
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-md border border-stone-200 p-6 space-y-4"
        >
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
            autoComplete="current-password"
            placeholder="パスワード"
          />

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-amber-300 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
          >
            {submitting ? "ログイン中..." : "ログイン"}
          </button>

          <p className="text-xs text-stone-500 text-center">
            初めて使う場合は{" "}
            <Link href="/register" className="text-amber-700 underline hover:text-amber-800">
              新規登録
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
