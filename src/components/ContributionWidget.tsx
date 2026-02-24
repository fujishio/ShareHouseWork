"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { ContributionData } from "@/types";

const RADIAN = Math.PI / 180;

type Props = {
  data: ContributionData[];
  myPoints: number;
  myRank: number;
};

const shortName = (name: string) => name.replace("あなた（家主）", "あなた");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderLabel(props: any) {
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
      <tspan x={x} dy="-0.65em" fontSize={12} fontWeight="500">
        {shortName(name)}
      </tspan>
      <tspan x={x} dy="1.4em" fontSize={15} fontWeight="700">
        {pct}%
      </tspan>
    </text>
  );
}

export default function ContributionWidget({ data, myPoints, myRank }: Props) {
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

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={130}
              dataKey="value"
              strokeWidth={3}
              stroke="#fff"
              labelLine={false}
              label={renderLabel}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* My score */}
      <div className="mt-1 py-2.5 px-3 bg-emerald-50 rounded-xl">
        <p className="text-sm text-emerald-700">
          <span className="font-bold">あなた: {myPoints}pt</span>
          <span className="mx-1 text-emerald-400">/</span>
          <span className="font-medium">{myRank}位</span>
          <span className="text-emerald-500 text-xs ml-1">（過去30日間）</span>
        </p>
      </div>
    </div>
  );
}
