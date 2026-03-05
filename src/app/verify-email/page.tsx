"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sendEmailVerification } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase-client";
import { useAuth } from "@/context/AuthContext";
import AppLogo from "@/components/AppLogo";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!loading && user?.emailVerified) {
      router.replace("/");
    }
  }, [loading, router, user]);

  const handleResend = async () => {
    if (!user) {
      setError("ログインしてから再送信してください");
      return;
    }

    setSending(true);
    setError(null);
    setMessage(null);
    try {
      await sendEmailVerification(user);
      setMessage("認証メールを再送信しました。メール内リンクを開いてください");
    } catch {
      setError("認証メールの再送信に失敗しました。少し待ってから再試行してください");
    } finally {
      setSending(false);
    }
  };

  const handleCheckVerified = async () => {
    if (!user) {
      setError("ログイン状態を確認できません。再ログインしてください");
      return;
    }

    setChecking(true);
    setError(null);
    setMessage(null);
    try {
      await user.reload();
      if (getClientAuth().currentUser?.emailVerified) {
        router.replace("/");
        return;
      }
      setMessage("まだ認証が完了していません。メールのリンクを開いてから再確認してください");
    } catch {
      setError("認証状態の更新に失敗しました");
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-svh bg-stone-50 flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-svh bg-stone-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <AppLogo />
          <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-6 space-y-3 text-sm">
            <p className="text-stone-700">メール認証を確認するにはログインが必要です。</p>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold rounded-xl py-2.5 transition-colors"
            >
              ログイン画面へ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AppLogo />
        <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-6 space-y-4">
          <h1 className="text-lg font-bold text-stone-800">メール認証を完了してください</h1>
          <p className="text-sm text-stone-600">
            <span className="font-medium">{user.email}</span> に送信された認証リンクを開いてください。
          </p>

          {message && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{message}</p>}
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-amber-300 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
          >
            {sending ? "送信中..." : "認証メールを再送信"}
          </button>

          <button
            type="button"
            onClick={handleCheckVerified}
            disabled={checking}
            className="w-full border border-stone-300 hover:bg-stone-50 disabled:text-stone-400 disabled:border-stone-200 text-stone-700 font-semibold rounded-xl py-2.5 text-sm transition-colors"
          >
            {checking ? "確認中..." : "認証完了を確認"}
          </button>

          <button
            type="button"
            onClick={() => signOut()}
            className="w-full text-xs text-stone-500 hover:text-stone-700 underline"
          >
            別のアカウントでログインする
          </button>
        </div>
      </div>
    </div>
  );
}
