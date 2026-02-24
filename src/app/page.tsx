import ContributionWidget from "@/components/ContributionWidget";
import ExpenseWidget from "@/components/ExpenseWidget";
import NoticesWidget from "@/components/NoticesWidget";
import {
  CONTRIBUTION_DATA,
  CURRENT_USER,
  MY_RANK,
  EXPENSE_SUMMARY,
  RECENT_NOTICES,
} from "@/lib/mock-data";

export default function HomePage() {
  const myContribution = CONTRIBUTION_DATA.find(
    (d) => d.member.id === CURRENT_USER.id
  );

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="pt-1">
        <p className="text-gray-400 text-sm">2026年2月24日 (火)</p>
        <h2 className="text-xl font-bold text-gray-800 mt-0.5">
          こんにちは、家主さん 👋
        </h2>
      </div>

      {/* Contribution widget */}
      <ContributionWidget
        data={CONTRIBUTION_DATA}
        myPoints={myContribution?.totalPoints ?? 0}
        myRank={MY_RANK}
        currentUserId={CURRENT_USER.id}
      />

      {/* Expense widget */}
      <ExpenseWidget summary={EXPENSE_SUMMARY} />

      {/* Notices widget */}
      <NoticesWidget notices={RECENT_NOTICES} />
    </div>
  );
}
