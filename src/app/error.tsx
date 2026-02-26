"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 text-red-600" size={18} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-red-700">画面の読み込みに失敗しました</h2>
          <p className="mt-1 text-xs text-red-700/90">
            通信状態を確認して、再試行してください。
          </p>
          <p className="mt-2 break-all text-[11px] text-red-600/80">{error.message}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            <RotateCcw size={13} />
            再試行
          </button>
        </div>
      </div>
    </div>
  );
}
