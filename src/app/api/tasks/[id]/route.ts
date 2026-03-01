import { NextResponse } from "next/server";
import { updateTask, deleteTask } from "@/server/task-store";
import type { TaskCategory, UpdateTaskInput, TaskUpdateResponse, TaskDeleteResponse, ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

const VALID_CATEGORIES: TaskCategory[] = [
  "炊事・洗濯",
  "水回りの掃除",
  "共用部の掃除",
  "ゴミ捨て",
  "買い出し",
  "季節・不定期",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = Number(id);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 }) as NextResponse<ApiErrorResponse>;
  }

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

  const input: UpdateTaskInput = { name, category, points, frequencyDays };
  const updated = await updateTask(taskId, input);
  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 }) as NextResponse<ApiErrorResponse>;
  }

  return NextResponse.json({ data: updated }) as NextResponse<TaskUpdateResponse>;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = Number(id);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 }) as NextResponse<ApiErrorResponse>;
  }

  const deleted = await deleteTask(taskId, new Date().toISOString());
  if (!deleted) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 }) as NextResponse<ApiErrorResponse>;
  }

  return NextResponse.json({ data: deleted }) as NextResponse<TaskDeleteResponse>;
}
