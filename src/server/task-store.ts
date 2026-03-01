import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { TASKS } from "@/domain/tasks/task-definitions";
import { nextId } from "@/server/store-utils";
import type { Task, CreateTaskInput, UpdateTaskInput } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "tasks.json");

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    // Seed with hardcoded default tasks on first run
    await writeFile(DATA_FILE, `${JSON.stringify(TASKS, null, 2)}\n`, "utf-8");
  }
}

async function readAllTasks(): Promise<Task[]> {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed as Task[];
}

async function writeTasks(tasks: Task[]) {
  await ensureDataFile();
  await writeFile(DATA_FILE, `${JSON.stringify(tasks, null, 2)}\n`, "utf-8");
}

export async function readTasks(): Promise<Task[]> {
  const all = await readAllTasks();
  return all.filter((t) => !t.deletedAt);
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const all = await readAllTasks();
  const created: Task = { id: nextId(all), ...input };
  await writeTasks([...all, created]);
  return created;
}

export async function updateTask(
  taskId: number,
  input: UpdateTaskInput
): Promise<Task | null> {
  const all = await readAllTasks();
  const index = all.findIndex((t) => t.id === taskId);
  if (index === -1) return null;
  const target = all[index];
  if (target.deletedAt) return null;
  const updated: Task = { ...target, ...input };
  all[index] = updated;
  await writeTasks(all);
  return updated;
}

export async function deleteTask(
  taskId: number,
  deletedAt: string
): Promise<Task | null> {
  const all = await readAllTasks();
  const index = all.findIndex((t) => t.id === taskId);
  if (index === -1) return null;
  const target = all[index];
  if (target.deletedAt) return target;
  const updated: Task = { ...target, deletedAt };
  all[index] = updated;
  await writeTasks(all);
  return updated;
}
