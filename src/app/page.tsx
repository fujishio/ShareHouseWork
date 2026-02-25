import ContributionWidget from "@/components/ContributionWidget";
import ExpenseWidget from "@/components/ExpenseWidget";
import NoticesWidget from "@/components/NoticesWidget";
import RecentTasksWidget from "@/components/RecentTasksWidget";
import {
  CONTRIBUTION_DATA,
  CURRENT_USER,
  EXPENSE_SUMMARY,
  MY_RANK,
  PRIORITY_TASKS,
  RECENT_NOTICES,
} from "@/features/home/mock/dashboard-data";
import { formatJpDate, getGreeting } from "@/shared/lib/time";

export default function HomePage() {
  const myContribution = CONTRIBUTION_DATA.find(
    (d) => d.member.id === CURRENT_USER.id
  );

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="pt-1">
        <p className="text-stone-400 text-sm">{formatJpDate()}</p>
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
