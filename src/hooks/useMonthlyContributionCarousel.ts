import { useMemo } from "react";

type MonthMemberShare = {
  name: string;
  points: number;
};

type MonthShare = {
  monthKey: string;
  total: number;
  members: MonthMemberShare[];
};

type ChartEntry = {
  name: string;
  value: number;
  color: string;
};

type CarouselMonth = {
  monthKey: string;
  monthLabel: string;
  total: number;
  chartData: ChartEntry[];
};

const COLORS = ["#d97706", "#57534e", "#059669", "#db2777", "#0284c7", "#7c3aed"];

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${year}年${Number(month)}月`;
}

export function useMonthlyContributionCarousel(months: MonthShare[]) {
  const carouselMonths = useMemo<CarouselMonth[]>(
    () =>
      months.map((month) => ({
        monthKey: month.monthKey,
        monthLabel: formatMonthLabel(month.monthKey),
        total: month.total,
        chartData: month.members.map((member, index) => ({
          name: member.name,
          value: member.points,
          color: COLORS[index % COLORS.length],
        })),
      })),
    [months]
  );

  return {
    carouselMonths,
  };
}
