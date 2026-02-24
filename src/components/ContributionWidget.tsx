"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ContributionData, TaskCompletion } from "@/types";
import { formatRelativeTime } from "@/lib/format";

type Props = {
  data: ContributionData[];
  myPoints: number;
  myRank: number;
  recentCompletions: TaskCompletion[];
};

export default function ContributionWidget({
  data,
  myPoints,
  myRank,
  recentCompletions,
}: Props) {
  const chartData = data.map((d) => ({
    name: d.member.name,
    value: d.totalPoints,
    color: d.member.color,
  }));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-800">家事貢献度</h2>
        <a
          href="/tasks"
          className="text-xs text-emerald-600 hover:underline font-medium"
        >
          詳細を見る →
        </a>
      </div>

      <div className="flex items-center gap-4">
        {/* Pie chart */}
        <div className="w-28 h-28 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={52}
                dataKey="value"
                strokeWidth={2}
                stroke="#fff"
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value}pt`, ""]}
                contentStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1.5">
          {data.map((d) => (
            <div key={d.member.id} className="flex items-center gap-2 text-sm">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: d.member.color }}
              />
              <span className="flex-1 truncate text-gray-700 text-xs">
                {d.member.name.replace("あなた（家主）", "あなた")}
              </span>
              <span className="text-xs font-medium text-gray-600">
                {d.totalPoints}pt
              </span>
              <span className="text-xs text-gray-400">{d.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* My score */}
      <div className="mt-3 py-2.5 px-3 bg-emerald-50 rounded-xl">
        <p className="text-sm text-emerald-700">
          <span className="font-bold">あなた: {myPoints}pt</span>
          <span className="mx-1 text-emerald-400">/</span>
          <span className="font-medium">{myRank}位</span>
          <span className="text-emerald-500 text-xs ml-1">（過去30日間）</span>
        </p>
      </div>

      {/* Recent completions */}
      <div className="mt-3 space-y-1">
        <p className="text-xs text-gray-400 font-medium mb-2">直近の完了</p>
        {recentCompletions.slice(0, 4).map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between text-xs text-gray-600 py-1 border-b border-gray-50 last:border-0"
          >
            <span className="flex-1 truncate">{c.taskName}</span>
            <span className="text-emerald-600 font-medium mx-2">
              +{c.points}pt
            </span>
            <span className="text-gray-400 flex-shrink-0">
              {c.completedBy} · {formatRelativeTime(c.completedAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
