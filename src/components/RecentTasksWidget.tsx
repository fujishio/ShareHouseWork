import Link from "next/link";
import { CheckCircle2, Smartphone, MessageSquare } from "lucide-react";
import type { TaskCompletion } from "@/types";
import { formatRelativeTime } from "@/lib/format";

type Props = {
  completions: TaskCompletion[];
};

export default function RecentTasksWidget({ completions }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-800">最近の家事</h2>
        <Link
          href="/tasks"
          className="text-xs text-emerald-600 hover:underline font-medium"
        >
          すべて見る →
        </Link>
      </div>

      {completions.length === 0 ? (
        <p className="text-sm text-gray-400 py-2 text-center">まだ記録がありません</p>
      ) : (
        <ul className="space-y-1">
          {completions.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 leading-snug truncate">
                  {task.taskName}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {task.completedBy} · {formatRelativeTime(task.completedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {task.source === "line" ? (
                  <MessageSquare size={12} className="text-green-400" />
                ) : (
                  <Smartphone size={12} className="text-gray-300" />
                )}
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  +{task.points}pt
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
