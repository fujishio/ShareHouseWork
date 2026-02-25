"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const RADIAN = Math.PI / 180;
const COLORS = ["#d97706", "#57534e", "#059669", "#db2777", "#0284c7", "#7c3aed"];

type MonthMemberShare = {
  name: string;
  points: number;
};

type MonthShare = {
  monthKey: string;
  total: number;
  members: MonthMemberShare[];
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

type Props = {
  months: MonthShare[];
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

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${year}年${Number(month)}月`;
}

export default function MonthlyContributionCarousel({ months }: Props) {
  return (
    <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
      <h3 className="font-bold text-stone-800">月別の過去割合</h3>
      <p className="mt-1 text-xs text-stone-500">
        取り消し済みを除いた月間ポイント比率です。
      </p>

      <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-1" dir="rtl">
        <div className="flex snap-x snap-mandatory gap-3">
          {months.map((month) => {
            const chartData = month.members.map((member, index) => ({
              name: member.name,
              value: member.points,
              color: COLORS[index % COLORS.length],
            }));

            return (
              <article
                key={month.monthKey}
                dir="ltr"
                className="w-[85%] min-w-[280px] snap-start rounded-xl border border-stone-200/60 bg-stone-50 p-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-stone-800">
                    {formatMonthLabel(month.monthKey)}
                  </h4>
                  <span className="text-xs text-stone-400">合計 {month.total}pt</span>
                </div>

                {chartData.length === 0 ? (
                  <p className="mt-4 text-sm text-stone-400">記録なし</p>
                ) : (
                  <>
                    <div className="mt-2 h-56 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={88}
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
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className="text-xs text-stone-400">合計</p>
                          <p className="text-lg font-bold text-stone-800">{month.total}pt</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
