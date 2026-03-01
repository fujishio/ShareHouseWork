import { NextResponse } from "next/server";
import { readTasks, createTask } from "@/server/task-store";
import type { TaskCategory, CreateTaskInput, TaskListResponse, TaskCreateResponse, ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

const VALID_CATEGORIES: TaskCategory[] = [
  "炊事・洗濯",
  "水回りの掃除",
  "共用部の掃除",
  "ゴミ捨て",
  "買い出し",
  "季節・不定期",
];

export async function GET() {
  const tasks = await readTasks();
  return NextResponse.json({ data: tasks }) as NextResponse<TaskListResponse>;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) as NextResponse<ApiErrorResponse>;
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 }) as NextResponse<ApiErrorResponse>;
  }

  const raw = body as Record<string, unknown>;

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 }) as NextResponse<ApiErrorResponse>;
  }

  const category = raw.category as TaskCategory;
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 }) as NextResponse<ApiErrorResponse>;
  }

  const points = Number(raw.points);
  if (!Number.isInteger(points) || points < 1) {
    return NextResponse.json({ error: "points must be a positive integer" }, { status: 400 }) as NextResponse<ApiErrorResponse>;
  }

  const frequencyDays = Number(raw.frequencyDays);
  if (!Number.isInteger(frequencyDays) || frequencyDays < 1) {
    return NextResponse.json({ error: "frequencyDays must be a positive integer" }, { status: 400 }) as NextResponse<ApiErrorResponse>;
  }

  const input: CreateTaskInput = { name, category, points, frequencyDays };
  const created = await createTask(input);
  return NextResponse.json({ data: created }, { status: 201 }) as NextResponse<TaskCreateResponse>;
}
