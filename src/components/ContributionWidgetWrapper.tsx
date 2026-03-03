"use client";

import { useAuth } from "@/context/AuthContext";
import ContributionWidget from "@/components/ContributionWidget";
import type { ContributionData } from "@/types";

type Props = {
  data: ContributionData[];
};

export default function ContributionWidgetWrapper({ data }: Props) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const myContribution = data.find((d) => d.member.id === uid);
  const myRank = data.findIndex((d) => d.member.id === uid) + 1;

  return (
    <ContributionWidget
      data={data}
      myPoints={myContribution?.totalPoints ?? 0}
      myRank={myRank || 1}
      currentUserId={uid}
    />
  );
}
