"use client";

import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Trophy } from "lucide-react";
import type { ContributionData } from "@/types";

const RADIAN = Math.PI / 180;

type Props = {
  data: ContributionData[];
  myPoints: number;
  myRank: number;
  currentUserId: number;
};

type LabelProps = {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  name: string;
  percent: number;
};

function renderLabel(props: LabelProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, name, percent } = props;
  const pct = Math.round(percent * 100);
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill="white"
    >
      <tspan x={x} dy="-0.65em" fontSize={11} fontWeight="500">
        {name}
      </tspan>
      <tspan x={x} dy="1.4em" fontSize={14} fontWeight="700">
        {pct}%
      </tspan>
    </text>
  );
}

export default function ContributionWidget({ data, myPoints, myRank, currentUserId }: Props) {
  const chartData = data.map((d) => ({
    name: d.member.id === currentUserId ? "あなた" : d.member.name,
    value: d.totalPoints,
    color: d.member.color,
  }));

  const totalPoints = data.reduce((sum, d) => sum + d.totalPoints, 0);

  return (
    <div className="bg-gradient-to-br from-white to-stone-100/60 rounded-2xl shadow-sm border border-stone-200/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-stone-800">タスク貢献度</h2>
        <Link
          href="/tasks"
          className="text-xs text-amber-600 hover:underline font-medium"
        >
          詳細を見る →
        </Link>
      </div>

      <div className="h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              dataKey="value"
              strokeWidth={3}
              stroke="#fafaf9"
              labelLine={false}
              label={renderLabel}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center label overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-xs text-stone-400">合計</p>
            <p className="text-xl font-bold text-stone-800">{totalPoints}pt</p>
          </div>
        </div>
      </div>

      {/* My score */}
      <div className="mt-1 py-2.5 px-3 bg-white/70 rounded-xl flex items-center gap-2">
        <Trophy size={16} className="text-amber-500 flex-shrink-0" />
        <p className="text-sm text-stone-700">
          <span className="font-bold">あなた: {myPoints}pt</span>
          <span className="mx-1.5 text-stone-300">|</span>
          <span className="font-semibold">{myRank}位</span>
          <span className="text-stone-400 text-xs ml-1">（過去30日間）</span>
        </p>
      </div>
    </div>
  );
}
