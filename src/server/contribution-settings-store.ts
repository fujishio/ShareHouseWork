import { getAdminFirestore } from "@/lib/firebase-admin";
import { toJstMonthKey } from "@/shared/lib/time";
import type { ContributionSettings, ContributionSettingsHistoryRecord } from "@/types";

const COLLECTION = "contributionSettings";

const DEFAULT_SETTINGS: ContributionSettings = {
  monthlyAmountPerPerson: 15000,
  memberCount: 4,
};

const MONTH_KEY_REGEX = /^\d{4}-\d{2}$/;
const HISTORY_START_MONTH = "2000-01";

export async function readContributionSettingsHistory(): Promise<ContributionSettingsHistoryRecord[]> {
  const db = getAdminFirestore();
  const snapshot = await db.collection(COLLECTION).get();

  if (snapshot.empty) {
    // Seed default on first read
    await db
      .collection(COLLECTION)
      .doc(HISTORY_START_MONTH)
      .set({ ...DEFAULT_SETTINGS, effectiveMonth: HISTORY_START_MONTH });
    return [{ effectiveMonth: HISTORY_START_MONTH, ...DEFAULT_SETTINGS }];
  }

  const records = snapshot.docs.map((doc) => ({
    effectiveMonth: doc.id,
    monthlyAmountPerPerson: doc.data().monthlyAmountPerPerson,
    memberCount: doc.data().memberCount,
  }));

  return records.sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth));
}

export function resolveContributionSettingsAtMonth(
  history: ContributionSettingsHistoryRecord[],
  monthKey: string
): ContributionSettings {
  if (!MONTH_KEY_REGEX.test(monthKey)) {
    return DEFAULT_SETTINGS;
  }

  const sorted = [...history].sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth));
  let current: ContributionSettings = DEFAULT_SETTINGS;

  for (const record of sorted) {
    if (record.effectiveMonth <= monthKey) {
      current = {
        monthlyAmountPerPerson: record.monthlyAmountPerPerson,
        memberCount: record.memberCount,
      };
      continue;
    }
    break;
  }

  return current;
}

export async function readContributionSettings(): Promise<ContributionSettings> {
  const history = await readContributionSettingsHistory();
  return resolveContributionSettingsAtMonth(history, toJstMonthKey());
}

export async function writeContributionSettings(settings: ContributionSettings): Promise<void> {
  const db = getAdminFirestore();
  const effectiveMonth = toJstMonthKey();
  await db
    .collection(COLLECTION)
    .doc(effectiveMonth)
    .set({ ...settings, effectiveMonth });
}
