import { Palette } from "lucide-react";
import ColorPicker from "@/components/ColorPicker";
import { LoadingNotice, RetryNotice } from "@/components/RequestStatus";
import { useAuth } from "@/context/AuthContext";
import { useProfileColor } from "@/hooks/useProfileColor";

export function ProfileColorSection() {
  const { user } = useAuth();
  const {
    selectedColor,
    takenColors,
    loading,
    loadError,
    saving,
    hasChanged,
    setSelectedColor,
    loadData,
    saveColor,
  } = useProfileColor(user?.uid);

  return (
    <div className="rounded-2xl border border-stone-200/60 bg-white p-4">
      <div className="mb-1 flex items-center gap-2">
        <Palette size={18} className="text-amber-500" />
        <h3 className="text-sm font-bold text-stone-800">テーマカラー</h3>
      </div>
      <p className="mb-3 text-xs text-stone-500">
        プロフィールに使用するカラーを選択します。同じハウスの他のメンバーが使用中のカラーは選べません。
      </p>

      {loading && <LoadingNotice message="プロフィールを読み込み中..." />}
      {loadError && (
        <RetryNotice
          message={loadError}
          actionLabel="再取得"
          onRetry={() => {
            void loadData();
          }}
          disabled={loading}
        />
      )}

      {!loading && !loadError && selectedColor && (
        <div className="space-y-3">
          <ColorPicker value={selectedColor} onChange={setSelectedColor} takenColors={takenColors} />
          <button
            type="button"
            onClick={() => {
              void saveColor();
            }}
            disabled={saving || !hasChanged}
            className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
          >
            {saving ? "保存中…" : "保存する"}
          </button>
        </div>
      )}
    </div>
  );
}
