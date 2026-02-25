import ContributionWidget from "@/components/ContributionWidget";
import ExpenseWidget from "@/components/ExpenseWidget";
import NoticesWidget from "@/components/NoticesWidget";
import RecentTasksWidget from "@/components/RecentTasksWidget";
import {
  CONTRIBUTION_DATA,
  CURRENT_USER,
  MY_RANK,
  EXPENSE_SUMMARY,
  RECENT_NOTICES,
  PRIORITY_TASKS,
} from "@/lib/mock-data";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "おはようございます";
  if (hour < 18) return "こんにちは";
  return "おつかれさまです";
}

function formatDate(): string {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const day = days[now.getDay()];
  return `${y}年${m}月${d}日 (${day})`;
}

export default function HomePage() {
  const myContribution = CONTRIBUTION_DATA.find(
    (d) => d.member.id === CURRENT_USER.id
  );

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="pt-1">
        <p className="text-stone-400 text-sm">{formatDate()}</p>
        <h2 className="text-xl font-bold text-stone-800 mt-0.5">
          {getGreeting()}、{CURRENT_USER.name}さん
        </h2>
      </div>

      {/* Contribution widget */}
      <ContributionWidget
        data={CONTRIBUTION_DATA}
        myPoints={myContribution?.totalPoints ?? 0}
        myRank={MY_RANK}
        currentUserId={CURRENT_USER.id}
      />

      {/* Priority tasks */}
      <RecentTasksWidget tasks={PRIORITY_TASKS} />

      {/* Expense widget */}
      <ExpenseWidget summary={EXPENSE_SUMMARY} />

      {/* Notices widget */}
      <NoticesWidget notices={RECENT_NOTICES} />
    </div>
  );
}
