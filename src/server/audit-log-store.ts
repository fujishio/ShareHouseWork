import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AuditLogRecord } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "audit-logs.json");

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, "[]\n", "utf-8");
  }
}

export async function readAuditLogs(): Promise<AuditLogRecord[]> {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf-8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed as AuditLogRecord[];
}

async function writeAuditLogs(records: AuditLogRecord[]) {
  await ensureDataFile();
  await writeFile(DATA_FILE, `${JSON.stringify(records, null, 2)}\n`, "utf-8");
}

export async function appendAuditLog(
  record: Omit<AuditLogRecord, "id">
): Promise<AuditLogRecord> {
  const logs = await readAuditLogs();
  const nextId = logs.reduce((max, current) => Math.max(max, current.id), 0) + 1;
  const created: AuditLogRecord = { id: nextId, ...record };
  await writeAuditLogs([...logs, created]);
  return created;
}
