import { useMemo } from "react";
import type { ContributionData } from "@/types";

type ChartEntry = {
  name: string;
  value: number;
  color: string;
};

export function useContributionWidget(data: ContributionData[], currentUserId: string) {
  const chartData = useMemo<ChartEntry[]>(
    () =>
      data
        .filter((entry) => entry.totalPoints > 0)
        .map((entry) => ({
          name: entry.member.id === currentUserId ? "あなた" : entry.member.name,
          value: entry.totalPoints,
          color: entry.member.color,
        })),
    [currentUserId, data]
  );

  const totalPoints = useMemo(
    () => data.reduce((sum, entry) => sum + entry.totalPoints, 0),
    [data]
  );

  return {
    chartData,
    totalPoints,
  };
}
