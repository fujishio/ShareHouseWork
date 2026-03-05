import { Wallet } from "lucide-react";
import { ErrorNotice, LoadingNotice, RetryNotice } from "@/components/RequestStatus";
import { useContributionSettings } from "@/hooks/useContributionSettings";

export function ContributionSettingsSection() {
  const {
    contributionAmount,
    setContributionAmount,
    contributionMemberCount,
    setContributionMemberCount,
    canEdit,
    contributionSaving,
    contributionSavedAt,
    contributionError,
    contributionLoading,
    contributionLoadError,
    monthlyTotal,
    loadContributionSettings,
    saveContributionSettings,
  } = useContributionSettings();

  return (
    <div className="rounded-2xl border border-stone-200/60 bg-white p-4">
      <div className="mb-1 flex items-center gap-2">
        <Wallet size={18} className="text-amber-500" />
        <h3 className="text-sm font-bold text-stone-800">共益費設定</h3>
      </div>

      {contributionLoading && (
        <div className="mb-3">
          <LoadingNotice message="共益費設定を読み込み中..." />
        </div>
      )}

      {contributionLoadError && (
        <div className="mb-3">
          <RetryNotice
            message={contributionLoadError}
            actionLabel="再取得"
            onRetry={() => {
              void loadContributionSettings();
            }}
            disabled={contributionLoading}
          />
        </div>
      )}

      <p className="mb-3 mt-1 text-xs text-stone-500">
        月次拠出合計 = 1人あたり金額 × 人数 で算出されます。保存した設定は当月から適用されます。
      </p>

      {!canEdit && (
        <p className="mb-3 rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-600">
          共益費設定は家主のみ変更できます。
        </p>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="contribution-amount" className="mb-1 block text-xs font-medium text-stone-600">
            1人あたり（円/月）
          </label>
          <input
            id="contribution-amount"
            type="number"
            min={1}
            value={contributionAmount}
            onChange={(event) => setContributionAmount(event.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
        <div>
          <label htmlFor="contribution-members" className="mb-1 block text-xs font-medium text-stone-600">
            人数
          </label>
          <input
            id="contribution-members"
            type="number"
            min={1}
            max={20}
            value={contributionMemberCount}
            onChange={(event) => setContributionMemberCount(event.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
      </div>

      <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
        月次拠出合計: <span className="font-bold">¥{monthlyTotal.toLocaleString()}</span>
      </div>

      <button
        type="button"
        onClick={() => {
          void saveContributionSettings();
        }}
        disabled={contributionSaving || !canEdit}
        className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
      >
        {contributionSaving ? "保存中…" : "保存する"}
      </button>

      {contributionError && (
        <div className="mt-2">
          <ErrorNotice message={contributionError} />
        </div>
      )}

      {contributionSavedAt && <p className="mt-2 text-center text-xs text-stone-400">保存しました</p>}
    </div>
  );
}
