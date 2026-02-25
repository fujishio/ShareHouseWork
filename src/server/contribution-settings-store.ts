import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ContributionSettings } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "contribution-settings.json");

const DEFAULT_SETTINGS: ContributionSettings = {
  monthlyAmountPerPerson: 15000,
  memberCount: 4,
};

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, `${JSON.stringify(DEFAULT_SETTINGS, null, 2)}\n`, "utf-8");
  }
}

export async function readContributionSettings(): Promise<ContributionSettings> {
  await ensureDataFile();

  const raw = await readFile(DATA_FILE, "utf-8");
  const parsed: unknown = JSON.parse(raw);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as ContributionSettings).monthlyAmountPerPerson !== "number" ||
    typeof (parsed as ContributionSettings).memberCount !== "number"
  ) {
    return DEFAULT_SETTINGS;
  }

  return parsed as ContributionSettings;
}

export async function writeContributionSettings(settings: ContributionSettings) {
  await ensureDataFile();
  await writeFile(DATA_FILE, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
}
