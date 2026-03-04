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

function docId(houseId: string, monthKey: string): string {
  return `${houseId}_${monthKey}`;
}

export async function readContributionSettingsHistory(
  houseId: string
): Promise<ContributionSettingsHistoryRecord[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .where("houseId", "==", houseId)
    .get();

  if (snapshot.empty) {
    // Seed default on first read
    const id = docId(houseId, HISTORY_START_MONTH);
    await db
      .collection(COLLECTION)
      .doc(id)
      .set({ ...DEFAULT_SETTINGS, houseId, effectiveMonth: HISTORY_START_MONTH });
    return [{ houseId, effectiveMonth: HISTORY_START_MONTH, ...DEFAULT_SETTINGS }];
  }

  const records = snapshot.docs.map((doc) => ({
    houseId: doc.data().houseId as string,
    effectiveMonth: doc.data().effectiveMonth as string,
    monthlyAmountPerPerson: doc.data().monthlyAmountPerPerson as number,
    memberCount: doc.data().memberCount as number,
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

export async function readContributionSettings(houseId: string): Promise<ContributionSettings> {
  const history = await readContributionSettingsHistory(houseId);
  return resolveContributionSettingsAtMonth(history, toJstMonthKey());
}

export async function writeContributionSettings(
  houseId: string,
  settings: ContributionSettings
): Promise<void> {
  const db = getAdminFirestore();
  const effectiveMonth = toJstMonthKey();
  await db
    .collection(COLLECTION)
    .doc(docId(houseId, effectiveMonth))
    .set({ ...settings, houseId, effectiveMonth });
}
