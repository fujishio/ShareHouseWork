import { getAdminFirestore } from "../lib/firebase-admin.ts";
import { getHouse } from "./house-store.ts";
import { toJstMonthKey } from "../shared/lib/time.ts";
import type {
  ContributionSettings,
  ContributionSettingsHistoryRecord,
  FirestoreContributionSettingsDoc,
  House,
} from "../types/index.ts";

const COLLECTION = "contributionSettings";

const DEFAULT_MONTHLY_AMOUNT_PER_PERSON = 15000;
const FALLBACK_MEMBER_COUNT = 1;

const DEFAULT_SETTINGS: ContributionSettings = {
  monthlyAmountPerPerson: DEFAULT_MONTHLY_AMOUNT_PER_PERSON,
  memberCount: FALLBACK_MEMBER_COUNT,
};

const MONTH_KEY_REGEX = /^\d{4}-\d{2}$/;
const HISTORY_START_MONTH = "2000-01";

function docId(houseId: string, monthKey: string): string {
  return `${houseId}_${monthKey}`;
}

function buildInitialSettings(memberCount: number): ContributionSettings {
  return {
    monthlyAmountPerPerson: DEFAULT_MONTHLY_AMOUNT_PER_PERSON,
    memberCount: Math.max(FALLBACK_MEMBER_COUNT, memberCount),
  };
}

function docToContributionSettingsHistoryRecord(
  data: FirestoreContributionSettingsDoc
): ContributionSettingsHistoryRecord {
  return {
    houseId: data.houseId,
    effectiveMonth: data.effectiveMonth,
    monthlyAmountPerPerson: data.monthlyAmountPerPerson,
    memberCount: data.memberCount,
  };
}

type ContributionStoreDeps = {
  db?: FirebaseFirestore.Firestore;
  monthKey?: string;
  getHouseById?: (houseId: string, db?: FirebaseFirestore.Firestore) => Promise<House | null>;
};

export async function listContributionSettingsHistory(
  houseId: string,
  deps: ContributionStoreDeps = {}
): Promise<ContributionSettingsHistoryRecord[]> {
  const db = deps.db ?? getAdminFirestore();
  const getHouseById = deps.getHouseById ?? getHouse;
  const house = await getHouseById(houseId, db);
  const currentMemberCount = house?.memberUids.length ?? FALLBACK_MEMBER_COUNT;
  const initialSettings = buildInitialSettings(currentMemberCount);
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
      .set({ ...initialSettings, houseId, effectiveMonth: HISTORY_START_MONTH });
    return [{ houseId, effectiveMonth: HISTORY_START_MONTH, ...initialSettings }];
  }

  const records = snapshot.docs.map((doc) =>
    docToContributionSettingsHistoryRecord(doc.data() as FirestoreContributionSettingsDoc)
  );

  const hasOnlyLegacySeed =
    records.length === 1 &&
    records[0]?.effectiveMonth === HISTORY_START_MONTH &&
    records[0]?.memberCount === 4;
  if (hasOnlyLegacySeed) {
    const legacyId = docId(houseId, HISTORY_START_MONTH);
    await db
      .collection(COLLECTION)
      .doc(legacyId)
      .set(
        {
          memberCount: initialSettings.memberCount,
        },
        { merge: true }
      );
    records[0].memberCount = initialSettings.memberCount;
  }

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

export async function readCurrentContributionSettings(
  houseId: string,
  deps: ContributionStoreDeps = {}
): Promise<ContributionSettings> {
  const history = await listContributionSettingsHistory(houseId, deps);
  return resolveContributionSettingsAtMonth(history, deps.monthKey ?? toJstMonthKey());
}

export async function updateContributionSettingsForCurrentMonth(
  houseId: string,
  settings: ContributionSettings,
  deps: ContributionStoreDeps = {}
): Promise<void> {
  const db = deps.db ?? getAdminFirestore();
  const effectiveMonth = deps.monthKey ?? toJstMonthKey();
  await db
    .collection(COLLECTION)
    .doc(docId(houseId, effectiveMonth))
    .set({ ...settings, houseId, effectiveMonth });
}

export async function updateContributionMemberCountForCurrentMonth(
  houseId: string,
  memberCount: number,
  deps: ContributionStoreDeps = {}
): Promise<void> {
  const db = deps.db ?? getAdminFirestore();
  const effectiveMonth = deps.monthKey ?? toJstMonthKey();
  const normalizedMemberCount = Math.max(FALLBACK_MEMBER_COUNT, memberCount);
  const ref = db.collection(COLLECTION).doc(docId(houseId, effectiveMonth));
  const doc = await ref.get();

  if (doc.exists) {
    const currentMemberCount = doc.data()?.memberCount;
    if (currentMemberCount === normalizedMemberCount) {
      return;
    }
    await ref.set(
      {
        houseId,
        effectiveMonth,
        memberCount: normalizedMemberCount,
      },
      { merge: true }
    );
    return;
  }

  const current = await readCurrentContributionSettings(houseId, deps);
  await ref.set({
    houseId,
    effectiveMonth,
    monthlyAmountPerPerson: current.monthlyAmountPerPerson,
    memberCount: normalizedMemberCount,
  });
}

export const readContributionSettingsHistory = listContributionSettingsHistory;
export const readContributionSettings = readCurrentContributionSettings;
export const writeContributionSettings = updateContributionSettingsForCurrentMonth;
export const syncContributionMemberCountForCurrentMonth =
  updateContributionMemberCountForCurrentMonth;
