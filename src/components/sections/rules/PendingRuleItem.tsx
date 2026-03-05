import { Check } from "lucide-react";
import type { Rule } from "@/types";
import { CATEGORY_EMOJI } from "./constants";

type PendingRuleItemProps = {
  rule: Rule;
  participantNames: string[];
  currentMemberName: string | null;
  acknowledgingId: string | null;
  onAcknowledge: (rule: Rule) => void;
};

export function PendingRuleItem({
  rule,
  participantNames,
  currentMemberName,
  acknowledgingId,
  onAcknowledge,
}: PendingRuleItemProps) {
  const acknowledged = rule.acknowledgedBy ?? [];
  const requiredMembers = participantNames.filter((m) => m !== rule.createdBy);
  const remaining = requiredMembers.filter((m) => !acknowledged.includes(m));
  const canCurrentUserAcknowledge =
    currentMemberName !== null &&
    currentMemberName !== rule.createdBy &&
    remaining.includes(currentMemberName);

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="text-sm mt-0.5">{CATEGORY_EMOJI[rule.category]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 leading-snug">{rule.title}</p>
          {rule.body && <p className="mt-1 text-sm text-stone-600 whitespace-pre-wrap">{rule.body}</p>}
          <p className="text-xs text-stone-400 mt-1">{rule.createdBy}が提案</p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {requiredMembers.map((member) => {
              const done = acknowledged.includes(member);
              return (
                <span
                  key={member}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    done ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-400"
                  }`}
                >
                  {done && <Check size={10} />}
                  {member}
                </span>
              );
            })}
          </div>

          {remaining.length > 0 && canCurrentUserAcknowledge && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={acknowledgingId === rule.id}
                onClick={() => onAcknowledge(rule)}
                className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                <Check size={10} />
                既読にする
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
