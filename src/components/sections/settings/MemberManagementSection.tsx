import { Users } from "lucide-react";
import { LoadingNotice, RetryNotice } from "@/components/RequestStatus";
import { useAuth } from "@/context/AuthContext";
import { useHouseMembers } from "@/hooks/useHouseMembers";

export function MemberManagementSection() {
  const { user } = useAuth();
  const { house, members, loading, loadError, saving, isCurrentUserHost, loadData, updateRole } = useHouseMembers(
    user?.uid
  );

  return (
    <div className="rounded-2xl border border-stone-200/60 bg-white p-4">
      <div className="mb-1 flex items-center gap-2">
        <Users size={18} className="text-amber-500" />
        <h3 className="text-sm font-bold text-stone-800">メンバー管理</h3>
      </div>
      <p className="mb-3 text-xs text-stone-500">ハウスメンバーのホスト権限を管理します。</p>

      {loading && <LoadingNotice message="メンバーを読み込み中..." />}
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

      {!loading && !loadError && !house && (
        <p className="text-xs text-stone-400">参加しているハウスが見つかりません。</p>
      )}

      {!loading && !loadError && house && (
        <div className="space-y-1.5">
          {members.map((member) => {
            const isHost = house.hostUids.includes(member.id);
            const isSelf = member.id === user?.uid;
            return (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-xl border border-stone-200/60 bg-stone-50 px-3 py-2"
              >
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-stone-800">
                    {member.name}
                    {isSelf && <span className="ml-1 font-normal text-stone-400">(あなた)</span>}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isHost ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {isHost ? "ホスト" : "メンバー"}
                </span>
                {isCurrentUserHost && !isSelf && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      void updateRole(member.id, isHost ? "revoke" : "grant");
                    }}
                    className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-50 ${
                      isHost
                        ? "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    }`}
                  >
                    {isHost ? "ホストを外す" : "ホストにする"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
