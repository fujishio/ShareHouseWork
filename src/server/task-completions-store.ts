import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TaskCompletionRecord } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "task-completions.json");

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, "[]\n", "utf-8");
  }
}

export async function readTaskCompletions(): Promise<TaskCompletionRecord[]> {
  await ensureDataFile();

  const raw = await readFile(DATA_FILE, "utf-8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed as TaskCompletionRecord[];
}

export async function writeTaskCompletions(records: TaskCompletionRecord[]) {
  await ensureDataFile();
  await writeFile(DATA_FILE, `${JSON.stringify(records, null, 2)}\n`, "utf-8");
}

export async function appendTaskCompletion(
  record: Omit<TaskCompletionRecord, "id">
): Promise<TaskCompletionRecord> {
  const records = await readTaskCompletions();
  const nextId = records.reduce((max, current) => Math.max(max, current.id), 0) + 1;

  const created: TaskCompletionRecord = {
    id: nextId,
    ...record,
  };

  await writeTaskCompletions([...records, created]);
  return created;
}

export async function cancelTaskCompletion(
  completionId: number,
  canceledBy: string,
  cancelReason: string,
  canceledAt: string
): Promise<TaskCompletionRecord | null> {
  const records = await readTaskCompletions();
  const index = records.findIndex((record) => record.id === completionId);

  if (index === -1) {
    return null;
  }

  const target = records[index];
  if (target.canceledAt) {
    return target;
  }

  const updated: TaskCompletionRecord = {
    ...target,
    canceledAt,
    canceledBy,
    cancelReason,
  };

  records[index] = updated;
  await writeTaskCompletions(records);
  return updated;
}
