import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ExpenseRecord, CreateExpenseInput, CancelExpenseInput } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "expenses.json");

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, "[]\n", "utf-8");
  }
}

export async function readExpenses(): Promise<ExpenseRecord[]> {
  await ensureDataFile();

  const raw = await readFile(DATA_FILE, "utf-8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed as ExpenseRecord[];
}

export async function writeExpenses(records: ExpenseRecord[]) {
  await ensureDataFile();
  await writeFile(DATA_FILE, `${JSON.stringify(records, null, 2)}\n`, "utf-8");
}

export async function appendExpense(
  input: CreateExpenseInput
): Promise<ExpenseRecord> {
  const records = await readExpenses();
  const nextId = records.reduce((max, current) => Math.max(max, current.id), 0) + 1;

  const created: ExpenseRecord = {
    id: nextId,
    ...input,
  };

  await writeExpenses([...records, created]);
  return created;
}

export async function cancelExpense(
  expenseId: number,
  input: CancelExpenseInput,
  canceledAt: string
): Promise<ExpenseRecord | null> {
  const records = await readExpenses();
  const index = records.findIndex((record) => record.id === expenseId);

  if (index === -1) {
    return null;
  }

  const target = records[index];
  if (target.canceledAt) {
    return target;
  }

  const updated: ExpenseRecord = {
    ...target,
    canceledAt,
    canceledBy: input.canceledBy,
    cancelReason: input.cancelReason,
  };

  records[index] = updated;
  await writeExpenses(records);
  return updated;
}
