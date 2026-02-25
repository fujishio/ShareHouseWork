import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Notice, CreateNoticeInput } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "notices.json");

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, "[]\n", "utf-8");
  }
}

export async function readNotices(): Promise<Notice[]> {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed as Notice[];
}

async function writeNotices(notices: Notice[]) {
  await ensureDataFile();
  await writeFile(DATA_FILE, `${JSON.stringify(notices, null, 2)}\n`, "utf-8");
}

export async function appendNotice(input: CreateNoticeInput): Promise<Notice> {
  const notices = await readNotices();
  const nextId = notices.reduce((max, n) => Math.max(max, n.id), 0) + 1;

  const created: Notice = {
    id: nextId,
    ...input,
  };

  await writeNotices([created, ...notices]);
  return created;
}

export async function deleteNotice(
  noticeId: number,
  deletedBy: string,
  deletedAt: string
): Promise<Notice | null> {
  const notices = await readNotices();
  const index = notices.findIndex((n) => n.id === noticeId);
  if (index === -1) return null;

  const target = notices[index];
  if (target.deletedAt) return target;

  const updated: Notice = { ...target, deletedAt, deletedBy };
  notices[index] = updated;
  await writeNotices(notices);
  return updated;
}
