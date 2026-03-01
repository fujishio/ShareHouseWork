import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { toJstMonthKey } from "@/shared/lib/time";
import type {
  ContributionSettings,
  ContributionSettingsHistoryRecord,
} from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "contribution-settings.json");

const DEFAULT_SETTINGS: ContributionSettings = {
  monthlyAmountPerPerson: 15000,
  memberCount: 4,
};

const MONTH_KEY_REGEX = /^\d{4}-\d{2}$/;
const HISTORY_START_MONTH = "2000-01";

function isValidHistoryRecord(value: unknown): value is ContributionSettingsHistoryRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ContributionSettingsHistoryRecord).effectiveMonth === "string" &&
    MONTH_KEY_REGEX.test((value as ContributionSettingsHistoryRecord).effectiveMonth) &&
    typeof (value as ContributionSettingsHistoryRecord).monthlyAmountPerPerson === "number" &&
    Number.isFinite((value as ContributionSettingsHistoryRecord).monthlyAmountPerPerson) &&
    (value as ContributionSettingsHistoryRecord).monthlyAmountPerPerson > 0 &&
    typeof (value as ContributionSettingsHistoryRecord).memberCount === "number" &&
    Number.isInteger((value as ContributionSettingsHistoryRecord).memberCount) &&
    (value as ContributionSettingsHistoryRecord).memberCount > 0
  );
}

function normalizeHistory(
  parsed: unknown,
  fallbackMonth: string = HISTORY_START_MONTH
): ContributionSettingsHistoryRecord[] {
  if (Array.isArray(parsed)) {
    const valid = parsed.filter(isValidHistoryRecord).map((entry) => ({
      ...entry,
      effectiveMonth: entry.effectiveMonth,
    }));
    if (valid.length > 0) {
      return valid.sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth));
    }
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    typeof (parsed as ContributionSettings).monthlyAmountPerPerson === "number" &&
    typeof (parsed as ContributionSettings).memberCount === "number" &&
    Number.isFinite((parsed as ContributionSettings).monthlyAmountPerPerson) &&
    (parsed as ContributionSettings).monthlyAmountPerPerson > 0 &&
    Number.isInteger((parsed as ContributionSettings).memberCount) &&
    (parsed as ContributionSettings).memberCount > 0
  ) {
    return [
      {
        effectiveMonth: fallbackMonth,
        monthlyAmountPerPerson: (parsed as ContributionSettings).monthlyAmountPerPerson,
        memberCount: (parsed as ContributionSettings).memberCount,
      },
    ];
  }

  return [
    {
      effectiveMonth: fallbackMonth,
      ...DEFAULT_SETTINGS,
    },
  ];
}

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    const initial: ContributionSettingsHistoryRecord[] = [
      { effectiveMonth: HISTORY_START_MONTH, ...DEFAULT_SETTINGS },
    ];
    await writeFile(DATA_FILE, `${JSON.stringify(initial, null, 2)}\n`, "utf-8");
  }
}

export async function readContributionSettingsHistory(): Promise<
  ContributionSettingsHistoryRecord[]
> {
  await ensureDataFile();

  const raw = await readFile(DATA_FILE, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  const history = normalizeHistory(parsed);

  if (JSON.stringify(parsed) !== JSON.stringify(history)) {
    await writeFile(DATA_FILE, `${JSON.stringify(history, null, 2)}\n`, "utf-8");
  }

  return history;
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

export async function writeContributionSettings(settings: ContributionSettings) {
  const history = await readContributionSettingsHistory();
  const effectiveMonth = toJstMonthKey();
  const nextRecord: ContributionSettingsHistoryRecord = {
    effectiveMonth,
    monthlyAmountPerPerson: settings.monthlyAmountPerPerson,
    memberCount: settings.memberCount,
  };

  const withoutThisMonth = history.filter((record) => record.effectiveMonth !== effectiveMonth);
  const nextHistory = [...withoutThisMonth, nextRecord].sort((a, b) =>
    a.effectiveMonth.localeCompare(b.effectiveMonth)
  );

  await writeFile(DATA_FILE, `${JSON.stringify(nextHistory, null, 2)}\n`, "utf-8");
}
