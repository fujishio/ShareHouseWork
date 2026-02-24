export type Member = {
  id: number;
  name: string;
  color: string; // Tailwind color class or hex for chart
};

export type TaskCompletion = {
  id: number;
  taskName: string;
  points: number;
  completedBy: string;
  completedAt: Date;
  source: "app" | "line";
};

export type ContributionData = {
  member: Member;
  totalPoints: number;
};

export type ExpenseSummary = {
  month: string;
  totalContributed: number;
  totalSpent: number;
  balance: number;
};

export type Notice = {
  id: number;
  title: string;
  postedBy: string;
  postedAt: Date;
};
