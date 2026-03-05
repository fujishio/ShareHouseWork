"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useMonthlyContributionCarousel } from "@/hooks/useMonthlyContributionCarousel";

const RADIAN = Math.PI / 180;
type MonthShare = {
  monthKey: string;
  total: number;
  members: { name: string; points: number }[];
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

export default function MonthlyContributionCarousel({ months }: Props) {
  const { carouselMonths } = useMonthlyContributionCarousel(months);

  return (
    <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm">
      <h3 className="font-bold text-stone-800">月別の過去割合</h3>
      <p className="mt-1 text-xs text-stone-500">
        取り消し済みを除いた月間ポイント比率です。
      </p>

      <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-1" dir="rtl">
        <div className="flex snap-x snap-mandatory gap-3">
          {carouselMonths.map((month) => {
            return (
              <article
                key={month.monthKey}
                dir="ltr"
                className="w-[85%] min-w-[280px] snap-start rounded-xl border border-stone-200/60 bg-stone-50 p-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-stone-800">
                    {month.monthLabel}
                  </h4>
                  <span className="text-xs text-stone-400">合計 {month.total}pt</span>
                </div>

                {month.chartData.length === 0 ? (
                  <p className="mt-4 text-sm text-stone-400">記録なし</p>
                ) : (
                  <>
                    <div className="mt-2 h-56 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={month.chartData}
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
                            {month.chartData.map((entry) => (
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
